// Compress before saving so both the offline queue and uploads stay small.
export const MAX_PHOTO_LENGTH=280000;
export function isPhoto(value){return typeof value==='string'&&value.length<=MAX_PHOTO_LENGTH&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value)}
export async function preparePhoto(file){
 if(!file||!file.type.startsWith('image/')||file.size>25*1024*1024)throw Error('Escolha uma imagem de até 25 MB.');
 const url=URL.createObjectURL(file),image=new Image();
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Não foi possível abrir a foto. Escolha uma imagem JPG ou PNG.'));image.src=url});
  let scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  for(let attempt=0;attempt<4;attempt++){
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
   for(const quality of [.8,.65,.5,.35]){const result=canvas.toDataURL('image/jpeg',quality);if(isPhoto(result))return result}
   scale*=.75;
  }
  throw Error('Não foi possível reduzir a foto. Tente outra imagem.');
 }finally{URL.revokeObjectURL(url)}
}

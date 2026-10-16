const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const reportEmission=(issuedAt=new Date())=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'medium'}).format(issuedAt);
export const reportLogoUrl=()=>new URL('./logo-abencoada.png',import.meta.url).href;
let logoPromise;
export function loadReportLogo(){return logoPromise??=fetch(reportLogoUrl()).then(response=>{if(!response.ok)throw Error('Não foi possível carregar a logo do relatório. Tente novamente.');return response.arrayBuffer()}).then(bytes=>new Uint8Array(bytes)).catch(error=>{logoPromise=null;throw error})}
export function drawReportHeader(pdf,{title,logo,issuedAt}){
 if(!logo)throw Error('A logo é obrigatória no relatório.');
 const width=pdf.internal.pageSize.getWidth(),image=pdf.getImageProperties(logo),logoWidth=48,logoHeight=logoWidth*image.height/image.width;
 pdf.addImage(logo,'PNG',17,12,logoWidth,logoHeight,'abencoada-logo','FAST');
 pdf.setTextColor(25,51,38);pdf.setFont('helvetica','bold');pdf.setFontSize(14);pdf.text(title,width-17,18,{align:'right'});
 pdf.setTextColor(65);pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text('EMITIDO EM '+reportEmission(issuedAt),width-17,25,{align:'right'});pdf.setFontSize(8);pdf.text('HORÁRIO DE BRASÍLIA',width-17,30,{align:'right'});
 pdf.setDrawColor(40,99,73);pdf.setLineWidth(.4);pdf.line(17,35,width-17,35);pdf.setTextColor(20);
 return 44;
}
export function reportHeaderHTML(title,issuedAt=new Date()){return `<header class="report-header"><img src="${esc(reportLogoUrl())}" alt="ABENÇOADA AGRÍCOLAS"><div><h1>${esc(title)}</h1><p>EMITIDO EM ${esc(reportEmission(issuedAt))} · HORÁRIO DE BRASÍLIA</p></div></header>`}
export const reportHeaderStyles='.report-header{display:flex;align-items:center;justify-content:space-between;gap:8mm;border-bottom:1px solid #286349;padding:0 0 5mm;margin:0 0 5mm;color:#111;text-align:right}.report-header img{width:48mm;height:auto;object-fit:contain;margin:0;display:block}.report-header h1{font:bold 16px Arial;margin:0 0 8px}.report-header p{font:10px Arial;margin:0}.report-heading-cell{border:0!important;padding:0!important;background:white!important}thead{display:table-header-group}';
export async function finishReportPrint(win){win.document.close();await Promise.all(Array.from(win.document.images,image=>image.decode()));await win.document.fonts.ready;win.focus();win.print()}

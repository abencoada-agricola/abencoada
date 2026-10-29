// Monochrome icons matching the rounded outlines used by navigation-icons.js.
// The brand silhouette is simplified from Logo Abençoada2.png for small sizes.
export const vehicleIcons = {
 carro: '<path d="M2 16v-3l3-1 3-5h7l4 5 3 1v4h-3M8 17h7M2 17h1M6 12h13M12 7v5"/><circle cx="5.5" cy="17" r="2.5"/><circle cx="17.5" cy="17" r="2.5"/>',
 camionete: '<path d="M2 9h8V6h6l3 6 3 1v4h-3M8 17h7M2 9v8h1M10 6v7H2m12-7v6h5"/><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
 trator: '<path d="M3 4h10M4 4v8M12 4v13M12 10h7l2 5M16 10V6M10 18h6M8 4v5h4"/><circle cx="6" cy="17" r="4"/><circle cx="19" cy="18" r="2.5"/>',
 colhedora: '<path d="M5 14v-4h7V6h5v8M12 10h5M5 10 2 6V3h3v2l4 4M17 14l3 6h3M21 15V6m-3 0h4M20 6V2m-2 0h4"/><rect x="3" y="14" width="14" height="6" rx="3"/><path d="M6 17h.01M10 17h.01M14 17h.01"/>',
 caminhao: '<path d="M2 5h12v12H8M2 5v12h1m11-8h5l3 5v3h-2m-6 0h1m1-8v5h6"/><circle cx="5.5" cy="18" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/>',
 cana: '<path d="M9 22V10h3v12M9 14h3m-3 4h3M16 22V12h3v10m-3-6h3m-3 4h3M10 10C8 4 5 3 2 3c3 2 5 4 6 7m3-1c0-4 2-7 5-8-2 3-3 5-3 8M17 12c-1-4-3-6-5-7m6 6c1-4 3-6 5-7-1 3-2 5-3 7"/>',
 abencoada: '<path fill="currentColor" stroke="none" transform="translate(1 0) scale(.023)" d="M135 22C177 177 359 186 542 230 773 285 915 415 929 596 946 806 892 958 779 991 663 1024 577 969 542 861 527 818 544 772 577 749 603 731 617 754 639 805 670 875 713 911 756 891 785 877 802 849 805 814L625 508 333 984Q324 998 303 998H234Q209 998 221 975L460 561 422 501 237 813Q226 832 207 832H135Q110 832 123 806L356 408Q388 355 424 373 450 381 469 410L523 465 559 419Q594 376 633 392 676 401 705 448L843 689C868 497 763 403 609 347 448 289 293 265 187 215 170 346 172 514 198 641Q203 657 190 674L156 703Q135 722 124 693C66 535 62 326 92 177 109 92 120 45 135 22Z"/>'
};
export const vehicleIconNames=Object.keys(vehicleIcons);
export function vehicleSvg(name, className='vehicle-icon') {
 return `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${vehicleIcons[name] || vehicleIcons.trator}</svg>`;
}
export const loadingIconsHTML=()=>vehicleIconNames.map(name=>vehicleSvg(name)).join('');
export const vehicleLoaderHTML=()=>`<span class="vehicle-loader" aria-hidden="true">${loadingIconsHTML()}</span>`;

// The app mark: a mini week grid with one dashed gap cell.
export const MARK = (s) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
 <rect width="100" height="100" rx="22" fill="#185FA5"/>
 <rect x="18" y="20" width="64" height="10" rx="5" fill="#E6F1FB"/>
 ${[[0,0,'#9FE1CB'],[1,0,'#CECBF6'],[2,0,'#FAC775'],[0,1,'#FAC775'],[1,1,'#9FE1CB'],[2,1,'gap'],[0,2,'#CECBF6'],[1,2,'#F4C0D1'],[2,2,'#9FE1CB']]
   .map(([c,r,f])=>f==='gap'
     ? `<rect x="${19+c*22}" y="${37+r*16}" width="18" height="12" rx="3.5" fill="#FCEBEB" stroke="#F09595" stroke-width="1.6" stroke-dasharray="3 2"/>`
     : `<rect x="${18+c*22}" y="${36+r*16}" width="20" height="14" rx="4" fill="${f}"/>`).join('')}
</svg>`;

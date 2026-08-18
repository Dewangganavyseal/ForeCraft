'use strict';
/* Simplex noise 2D + fbm — deterministik dgn seed */
const Noise=(()=>{
  const grad3=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  const F2=0.5*(Math.sqrt(3)-1),G2=(3-Math.sqrt(3))/6;
  class Simplex{
    constructor(seed){
      const p=new Uint8Array(256);for(let i=0;i<256;i++)p[i]=i;
      let s=(seed>>>0)||1;
      const rnd=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};
      for(let i=255;i>0;i--){const j=(rnd()*(i+1))|0;const t=p[i];p[i]=p[j];p[j]=t;}
      this.perm=new Uint8Array(512);this.pm12=new Uint8Array(512);
      for(let i=0;i<512;i++){this.perm[i]=p[i&255];this.pm12[i]=this.perm[i]%12;}
    }
    noise(x,y){
      let n0=0,n1=0,n2=0;
      const sk=(x+y)*F2,i=Math.floor(x+sk),j=Math.floor(y+sk);
      const t=(i+j)*G2,x0=x-(i-t),y0=y-(j-t);
      let i1,j1;if(x0>y0){i1=1;j1=0;}else{i1=0;j1=1;}
      const x1=x0-i1+G2,y1=y0-j1+G2,x2=x0-1+2*G2,y2=y0-1+2*G2;
      const ii=i&255,jj=j&255;
      let t0=0.5-x0*x0-y0*y0;
      if(t0>=0){const g=grad3[this.pm12[ii+this.perm[jj]]];t0*=t0;n0=t0*t0*(g[0]*x0+g[1]*y0);}
      let t1=0.5-x1*x1-y1*y1;
      if(t1>=0){const g=grad3[this.pm12[ii+i1+this.perm[jj+j1]]];t1*=t1;n1=t1*t1*(g[0]*x1+g[1]*y1);}
      let t2=0.5-x2*x2-y2*y2;
      if(t2>=0){const g=grad3[this.pm12[ii+1+this.perm[jj+1]]];t2*=t2;n2=t2*t2*(g[0]*x2+g[1]*y2);}
      return 70*(n0+n1+n2);
    }
  }
  const fbm=(n,x,y,oct=3,lac=2,gain=0.5)=>{
    let a=1,f=1,s=0,nm=0;
    for(let i=0;i<oct;i++){s+=a*n.noise(x*f,y*f);nm+=a;a*=gain;f*=lac;}
    return s/nm;
  };
  return {Simplex,fbm};
})();

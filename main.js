const imglist = new Array();


// 画像のドロップボックス
const elDrop = document.getElementById("droparea");

elDrop.addEventListener("dragover", event=>{
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    elDrop.classList.add("dropover");
});

elDrop.addEventListener("dragleave", ()=>{
    elDrop.classList.remove("dropover");
});

elDrop.addEventListener("drop", event=>{
    event.preventDefault();
    elDrop.classList.remove("dropover");

    const files = event.dataTransfer.files;
    
    showImage(files);
});


const showImage = files =>{
    for(const file of files){
        //console.log(file);
        const reader = new FileReader;
        reader.onloadend = event =>{
            const src = event.target.result;
            const img = document.createElement("img");
            img.src = src;
            
            img.onload = ()=>{
                const e = new IMG(img);
                imglist.push(e);
                e.show();
            };
        };
        reader.readAsDataURL(file);
    }
};

class IMG{
    constructor(img){
        if(img){
            const canvas = document.createElement("canvas");
            const width = img.naturalWidth;
            const height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
    
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, width, height).data;
    
            const r = new Uint8ClampedArray(data.length/4);
            const g = new Uint8ClampedArray(data.length/4);
            const G = new Uint8ClampedArray(data.length/4);
            const b = new Uint8ClampedArray(data.length/4);
            const a = new Uint8ClampedArray(data.length/4);
    
            for(let i=0;i<data.length/4;i++){
                r[i] = data[i*4+0];
                g[i] = data[i*4+1];
                b[i] = data[i*4+2];
                a[i] = data[i*4+3];
            }
    
    
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
            this.width = width;
            this.height = height;
            this.gaso = data.length/4;
        }
    }

    crop(top=0, left=0, width=100, height=100){
        // leftかwidthがおかしければ弾く
        if(left<0 || left+width>this.width){
            throw "yoko ga okasii";
        }
        // topかheightがおかしければ弾く
        if(height<0 || height+top>this.height){
            throw "tate ga okasii";
        }

        
        const newimg = new IMG;
        newimg.r = new Uint8ClampedArray(width*height);
        newimg.g = new Uint8ClampedArray(width*height);
        newimg.b = new Uint8ClampedArray(width*height);
        newimg.a = new Uint8ClampedArray(width*height);
        newimg.width = width;
        newimg.height = height;
        newimg.gaso = width*height;

        for(let h=0;h<height;h++){
            for(let w=0;w<width;w++){
                newimg.r[h*width + w] = this.r[(top+h)*this.width + (left+w)];
                newimg.g[h*width + w] = this.g[(top+h)*this.width + (left+w)];
                newimg.b[h*width + w] = this.b[(top+h)*this.width + (left+w)];
                newimg.a[h*width + w] = this.a[(top+h)*this.width + (left+w)];
            }
        }

        return newimg;
    }

    //引数のIMGとの二乗平均誤差を計算
    mse(img){
        //画像サイズが異なれば弾く
        if(this.width !== img.width){
            throw "img width dont match";
        }

        if(this.height !== img.height){
            throw "img height dont match";
        }

        let sum = 0;
        for(let i=0;i<this.gaso;i++){
            const diff = this.b[i] - img.b[i];
            sum += diff**2;
        }
        const mse = sum/this.gaso;

        return mse;
    }

    //画像を出力
    show(){
        const canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        const context = canvas.getContext("2d");
        const imgdata = context.getImageData(0, 0, this.width, this.height);
        const data = imgdata.data;
        for(let i=0;i<this.gaso;i++){
            data[i*4+0] = this.r[i];
            data[i*4+1] = this.g[i];
            data[i*4+2] = this.b[i];
            data[i*4+3] = this.a[i];
        }
        context.putImageData(imgdata, 0, 0);

        const src = canvas.toDataURL();
        const img = document.createElement("img");

        if(this.width>250){
            const ratio = 250/this.width;
            img.width = 250;
            img.height = this.height * ratio;
        }

        img.src = src;

        document.body.appendChild(img);
    }

    //自身と引数のズレを検出する
    search(img, top0, left0, width=25, dx=20){
        //const width = 25;
        
        
        // leftかwidthがおかしければ弾く
        if(left0-dx<0 || left0+dx+width>this.width){
            throw "yoko ga okasii";
        }
        // topかheightがおかしければ弾く
        if(top0-dx<0 || top0+dx+width>this.height){
            throw "tate ga okasii";
        }

        const img0 = this.crop(top0, left0, width, width);


        // 周囲dxピクセルを検索する
        const mses = new Array();
        let i = 0;
        for(let top=top0-dx;top<top0+dx;top++){
            mses.push([]);
            for(let left=left0-dx;left<left0+dx;left++){
                const img1 = img.crop(top, left, width, width);
                mses[i].push(img0.mse(img1));
            }
            i++;
        }


        //最小値を検索と平均の計算
        let min = 256**2, dtop = -1, dleft = -1, sum = 0;
        for(let i=0;i<dx*2;i++){
            for(let j=0;j<dx*2;j++){
                sum += mses[i][j];
                if(min>mses[i][j]){
                    min = mses[i][j];
                    dtop = i;
                    dleft = j;
                }
            }
        }
        dtop -= dx; dtop *= -1;
        dleft -= dx; dleft *= -1;
        const mean = sum / (dx*dx*2*2);

        
        // 一致点から上下zureピクセルのmseを求める
        const mse_left = [];
        const mse_top = [];
        const zure = 4;
        let sum_left = 0, sum_top = 0;
        for(let top=top0-zure-dtop;top<top0+zure-dtop+1;top++){
            const img1 = img.crop(top, left0-dleft, width, width);
            const val = img0.mse(img1)-min
            mse_top.push(val);
            sum_top += val;
        }
        for(let left = left0-zure-dleft;left<left0+zure-dleft+1;left++){
            const img1 = img.crop(top0-dtop, left, width, width);
            const val = img0.mse(img1)-min
            mse_left.push(val);
            sum_left += val;
        }

        //mseを正規化
        for(let i=0;i<mse_left.length;i++){
            mse_left[i] /= sum_left/(zure*2+1);
            mse_top[i] /= sum_top/(zure*2+1);
        }

        // console.log(mses);
        console.log(mse_left);
        console.log(mse_top);


        return {dtop, dleft, min};
    }
}


function test(){
    for(let i=0;i<10;i++){
        const x = 40 + ~~(Math.random()*50);
        const y = 40 + ~~(Math.random()*50);
        const a=imglist[0].crop(x,y,200,200);
        const b=imglist[0].crop(x,y,200,200);
        a.search(b, 50, 50);
        console.log("---------------");
    }
}
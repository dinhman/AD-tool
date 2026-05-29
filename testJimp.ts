import { Jimp } from 'jimp';

async function testJimp() {
    const width = 100;
    const height = 100;
    const rgbaBuffer = Buffer.alloc(width * height * 4);
    for (let i = 0; i < rgbaBuffer.length; i += 4) {
        rgbaBuffer[i] = 255; // R
        rgbaBuffer[i+1] = 0; // G
        rgbaBuffer[i+2] = 0; // B
        rgbaBuffer[i+3] = 255; // A
    }
    
    try {
        const img = new Jimp({ data: rgbaBuffer, width, height });
        await img.write('test.png');
        console.log("Success");
    } catch (e) {
        console.error(e);
    }
}
testJimp();

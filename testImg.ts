import { screen, Region } from '@nut-tree-fork/nut-js';
import { Jimp } from 'jimp';

async function test() {
    const img = await screen.grabRegion(new Region(0,0,500,500));
    const rgb = await img.toRGB();
    const jimpImage = new Jimp({ data: Buffer.from(rgb.data), width: rgb.width, height: rgb.height });
    await jimpImage.write('test_jimp.png');
    console.log("Written to test_jimp.png. Please check if it looks correct.");
}
test();

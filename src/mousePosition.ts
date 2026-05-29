import { mouse, Point } from "@nut-tree-fork/nut-js";

async function trackMouse() {
    console.log("=== CÔNG CỤ TÌM TỌA ĐỘ CHUỘT ===");
    console.log("Hãy di chuyển chuột đến vị trí bạn muốn lấy tọa độ (Ví dụ: ô nhập số line, nút Save).");
    console.log("Chương trình sẽ liên tục in ra tọa độ hiện tại trong vòng 30 giây tới.\n");

    let count = 0;
    const interval = setInterval(async () => {
        try {
            const pos = await mouse.getPosition();
            console.log(`[Giây thứ ${count}] Tọa độ hiện tại: X=${pos.x}, Y=${pos.y}`);
            
            count++;
            if (count > 30) {
                clearInterval(interval);
                console.log("\nĐã kết thúc quá trình lấy tọa độ.");
            }
        } catch (e) {
            console.error("Lỗi khi đọc tọa độ chuột", e);
        }
    }, 1000);
}

trackMouse();

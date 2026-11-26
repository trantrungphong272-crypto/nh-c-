# Vòng Tròn Nhạc — Trình Hiển Thị Âm Thanh & Lời Bài Hát (Lively Wallpaper)

Phiên bản Việt hóa hoàn chỉnh của **Circular Music Visualizer**, tối ưu hiệu suất Canvas 2D và tích hợp hệ thống đồng bộ lời bài hát theo thời gian thực cho Windows & **Lively Wallpaper**.

## Tính năng chính

1. **Vòng tròn Equalizer đa phong cách**:
   - Hỗ trợ 5 kiểu hiển thị: *Thanh tròn*, *Thanh vuông*, *Chấm LED*, *Đường sóng*, *Dạng gai*.
   - Phản hồi âm trầm (Bass) tạo nhịp xung kích và sóng lan tỏa; âm cao (Treble) tạo chuyển động chi tiết.
   - Tùy chỉnh xoay theo chiều kim đồng hồ, ngược chiều kim đồng hồ hoặc đứng yên; điều chỉnh số lượng, độ dày, chiều dài và hướng thanh.
2. **Đồng hồ trung tâm tiếng Việt**:
   - Hiển thị giờ thực theo định dạng 12 giờ (SA/CH) hoặc 24 giờ, kèm thứ trong tuần và ngày/tháng bằng tiếng Việt (ví dụ: `Thứ Năm, 26 tháng 11`).
3. **6 Hình nền động & Hình nền cá nhân**:
   - *Tinh vân vũ trụ*, *Thành phố về đêm*, *Bokeh nhiều màu*, *Cực quang (Aurora)*, *Gradient Neon*, *Nền tối tối giản* và hỗ trợ nạp ảnh cá nhân.
   - Tùy chỉnh độ mờ, độ tối lớp phủ, ánh sáng lan tỏa và phản ứng nhịp bass.
4. **Hệ thống Lời Bài Hát (Lyrics) đa nguồn**:
   - Hỗ trợ tệp `.lrc` có timestamp, tệp `.txt`, nhập lời thủ công và tra cứu từ API công khai hợp pháp **LRCLIB.net** (có lưu cache cục bộ).
   - Nếu không tìm thấy lời bài hát phù hợp, hiển thị thông báo rõ ràng *"Chưa tìm thấy lời bài hát"*.
5. **Tối ưu hiệu suất Windows**:
   - Giới hạn FPS (30/60 FPS), bộ nhớ đệm TypedArray không cấp phát rác trong vòng lặp `requestAnimationFrame`, tự động giảm mật độ hạt khi FPS thấp và tạm dừng khi hình nền bị che khuất (`livelyWallpaperPlaybackChanged`).

## Hướng dẫn cài đặt vào Lively Wallpaper

1. Mở ứng dụng **Lively Wallpaper** trên Windows.
2. Kéo thả tệp `VongTronNhac-LivelyWallpaper.zip` (hoặc chọn **Thêm hình nền -> Mở tệp `index.html`** trong thư mục đã giải nén).
3. Trong Lively Wallpaper, bật quyền **Âm thanh hệ thống (Audio Visualizer)** trong phần cài đặt chung của Lively để vòng tròn Equalizer nhận dữ liệu qua `livelyAudioListener`.
4. Nhấn chuột phải vào hình nền trong Lively -> chọn **Tùy chỉnh (Customize Wallpaper)** để chỉnh toàn bộ 7 nhóm thiết lập tiếng Việt từ `LivelyProperties.json`.

## Lưu ý kỹ thuật về đồng bộ lời bài hát trong Lively

- Lively Wallpaper cung cấp tên bài hát, ca sĩ và ảnh bìa album từ Windows SMTC thông qua hàm `livelyCurrentTrack`, nhưng **API chuẩn của Lively không truyền vị trí thời gian phát (timestamp giây hiện tại) từ trình phát ngoài** (Spotify, YouTube, Zing MP3...).
- Vì vậy, khi chạy trong Lively Wallpaper:
  - Trình hiển thị tự động đếm thời gian phát từ thời điểm nhận bài hát mới qua `livelyCurrentTrack`.
  - Bạn có thể tinh chỉnh thanh **Độ trễ đồng bộ (ms)** trong cài đặt (`lyricsOffsetMs`) hoặc dùng chế độ trình phát tích hợp trong trình duyệt (nạp tệp nhạc `.mp3/.wav` + tệp `.lrc`) để đồng bộ chính xác đến từng mili-giây.

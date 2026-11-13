// Nội dung chung của thiệp. Danh sách người nhận và địa điểm KHÔNG nằm ở đây:
// chúng nằm trong .env (INVITES, VENUE), xem .env.example và README.

export interface InfoSection {
  id: string
  label: string
  value: string
  note?: string
}

export const content = {
  host: 'Minh Quân',

  // Tên khách mặc định khi link không có tên
  guestFallback: 'bạn',
  // "Mời bạn" + {tên}; khi không có tên thì "Mời" + "bạn" để không bị lặp chữ
  lead: 'Mời bạn',
  leadFallback: 'Mời',

  titleSmall: 'Lễ',
  titleMain: 'Tốt nghiệp',
  invitation: 'đến dự lễ tốt nghiệp của',

  // Thêm / sửa / xoá mục ở đây. Mỗi mục tự hiển thị trên thiệp theo thứ tự.
  // Mục có id 'place' sẽ lấy giá trị từ VENUE trong .env nếu có.
  sections: [
    {
      id: 'time',
      label: 'Thời gian',
      value: '13:00 – 16:30 · 29/11',
      note: '13:00 là bắt đầu làm lễ rồi, nên bạn có thể đến tầm 11:00, 12:00 hoặc 17:00 nha',
    },
    {
      id: 'place',
      label: 'Địa điểm',
      value: 'Sẽ cập nhật sau',
    },
  ] satisfies InfoSection[],
}

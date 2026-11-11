// Toàn bộ nội dung thiệp nằm ở đây. Chỉ cần sửa file này, không phải đụng vào component.

export interface InfoSection {
  id: string
  label: string
  value: string
  note?: string
}

export const content = {
  host: 'Minh Quân',

  // Tên khách mặc định khi link không có ?to=
  guestFallback: 'bạn',
  // "Mời bạn" + {tên}; khi không có tên thì "Mời" + "bạn" để không bị lặp chữ
  lead: 'Mời bạn',
  leadFallback: 'Mời',

  titleSmall: 'Lễ',
  titleMain: 'Tốt nghiệp',
  invitation: 'đến dự lễ tốt nghiệp của',

  // Thêm / sửa / xoá mục ở đây. Mỗi mục tự hiển thị trên thiệp theo thứ tự.
  sections: [
    {
      id: 'time',
      label: 'Thời gian',
      value: '13:00 · Ngày 29/11',
      note: 'Bạn có thể đến sớm lúc 12:00 hoặc chiều lúc 17:00',
    },
    {
      id: 'place',
      label: 'Địa điểm',
      value: 'Sẽ cập nhật sau',
    },
  ] satisfies InfoSection[],
}

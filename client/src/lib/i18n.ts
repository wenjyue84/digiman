import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  ms: 'Bahasa Malaysia', 
  'zh-cn': '简体中文',
  es: 'Español',
  ja: '日本語',
  ko: '한국어'
} as const;

export type Language = keyof typeof SUPPORTED_LANGUAGES;

// Translation keys for the guest check-in form
export interface Translations {
  // Header and welcome
  welcomeTitle: string;
  completeCheckIn: string;
  assignedCapsule: string;
  prefilledInfo: string;
  
  // Personal Information Section
  personalInfo: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  contactNumberLabel: string; 
  contactNumberPlaceholder: string;
  genderLabel: string;
  genderPlaceholder: string;
  male: string;
  female: string;
  nationalityLabel: string;
  nationalityPlaceholder: string;

  // Identity Documents Section  
  identityDocs: string;
  identityDocsDesc: string;
  icNumberLabel: string;
  icNumberPlaceholder: string;
  passportNumberLabel: string;
  passportNumberPlaceholder: string;
  icPhotoLabel: string;
  icPhotoDesc: string;
  passportPhotoLabel: string;
  passportPhotoDesc: string;
  chooseFile: string;

  // Payment Section
  paymentMethod: string;
  paymentMethodPlaceholder: string;
  cash: string;
  card: string;
  onlineTransfer: string;
  paymentNote: string;

  // Buttons and Actions
  completeCheckInBtn: string;
  completingCheckIn: string;
  editInfo: string;

  // Success Page
  goodDay: string;
  welcomeHostel: string;
  address: string;
  hostelPhotos: string;
  googleMaps: string;
  checkInVideo: string;
  checkInTime: string;
  checkOutTime: string;
  doorPassword: string;
  capsuleNumber: string;
  accessCard: string;
  importantReminders: string;
  noCardWarning: string;
  noSmoking: string;
  cctvWarning: string;
  infoEditable: string;
  editUntil: string;
  editMyInfo: string;
  linkExpired: string;
  linkExpiresIn: string;
  assistance: string;
  enjoyStay: string;

  // Loading and Error States
  validatingLink: string;
  invalidLink: string;
  invalidLinkDesc: string;
  expiredLink: string;
  expiredLinkDesc: string;
  error: string;
  validationError: string;
  checkInFailed: string;
  checkInSuccess: string;
  checkInSuccessDesc: string;

  // Language Switcher
  selectLanguage: string;
  currentLanguage: string;
  
  // Print and Email
  printCheckInSlip: string;
  saveAsPdf: string;
  sendToEmail: string;
  sendCheckInSlipEmail: string;
  enterEmailForSlip: string;
  emailAddress: string;
  sendEmail: string;
  cancel: string;
  invalidEmail: string;
  pleaseEnterValidEmail: string;
  emailSent: string;
  checkInSlipSentTo: string;

  // Helper tips (Self Check-in guidance)
  tipsTitle: string;
  tipHaveDocument: string;
  tipPhoneFormat: string;
  tipGenderPrivacy: string;
  tipLanguageSwitch: string;

  photoTipsTitle: string;
  photoTipLighting: string;
  photoTipGlare: string;
  photoTipSize: string;

  // Inline field hints
  nameHint: string;
  phoneHint: string;
  genderHint: string;
  nationalityHint: string;
  icHint: string;
  passportHint: string;
  photoHint: string;
  emergencyContactHint: string;
  emergencyPhoneHint: string;
  notesHint: string;
  paymentMethodHint: string;
  cashDescriptionHint: string;

  // FAQ (Accordion)
  faqNeedHelp: string;
  faqIntro: string;
  faqIcVsPassportQ: string;
  faqIcVsPassportA: string;
  faqPhotoUploadQ: string;
  faqPhotoUploadA: string;
  faqPhoneFormatQ: string;
  faqPhoneFormatA: string;
  faqGenderWhyQ: string;
  faqGenderWhyA: string;
  faqPrivacyQ: string;
  faqPrivacyA: string;
  faqEditAfterQ: string;
  faqEditAfterA: string;

  // Common additional notes quick-select
  commonNotesTitle: string;
  commonNoteLateArrival: string;
  commonNoteBottomCapsule: string;
  commonNoteArriveEarly: string;
  commonNoteQuietArea: string;
  commonNoteExtraBedding: string;
}

// English translations (default)
const enTranslations: Translations = {
  welcomeTitle: "Welcome to Pelangi Capsule Hostel",
  completeCheckIn: "Complete your check-in information",
  assignedCapsule: "Your assigned capsule",
  prefilledInfo: "Pre-filled Information:",

  personalInfo: "Personal Information", 
  fullNameLabel: "Full Name as in IC/Passport *",
  fullNamePlaceholder: "Enter your name as shown in ID",
  contactNumberLabel: "Contact Number *",
  contactNumberPlaceholder: "Enter your contact number (e.g., +60123456789)",
  genderLabel: "Gender *",
  genderPlaceholder: "Select gender",
  male: "Male",
  female: "Female", 
  nationalityLabel: "Nationality *",
  nationalityPlaceholder: "e.g., Malaysian, Singaporean",

  identityDocs: "Identity Documents *",
  identityDocsDesc: "Please provide either IC or Passport information with document photo:",
  icNumberLabel: "IC Number (for Malaysians)",
  icNumberPlaceholder: "e.g., 950101-01-1234",
  passportNumberLabel: "Passport Number (for Foreigners)",
  passportNumberPlaceholder: "e.g., A12345678",
  icPhotoLabel: "IC Document Photo",
  icPhotoDesc: "Upload photo of your IC",
  passportPhotoLabel: "Passport Document Photo", 
  passportPhotoDesc: "Upload photo of your passport",
  chooseFile: "Choose File",

  paymentMethod: "Payment Method *",
  paymentMethodPlaceholder: "Select preferred payment method",
  cash: "Cash",
  card: "Credit/Debit Card",
  onlineTransfer: "Online Transfer",
  paymentNote: "Payment will be collected at the front desk upon arrival",

  completeCheckInBtn: "Complete Check-in",
  completingCheckIn: "Completing Check-in...",
  editInfo: "Edit My Information",

  goodDay: "Good Day, Our Honorable Guest!",
  welcomeHostel: "Welcome to Pelangi Capsule Hostel",
  address: "Address:",
  hostelPhotos: "📸 Hostel Photos",
  googleMaps: "📍 Google Maps", 
  checkInVideo: "🎥 Check-in Video",
  checkInTime: "Check-in: From 3:00 PM",
  checkOutTime: "Check-out: Before 12:00 PM",
  doorPassword: "Door Password:",
  capsuleNumber: "Your Capsule No.:",
  accessCard: "Capsule Access Card: Placed on your pillow",
  importantReminders: "Important Reminders:",
  noCardWarning: "🚫 Do not leave your card inside the capsule and close the door",
  noSmoking: "🚭 No Smoking in hostel area", 
  cctvWarning: "🎥 CCTV monitored – Violation (e.g., smoking) may result in RM300 penalty",
  infoEditable: "Information Editable",
  editUntil: "You can edit your check-in information until",
  editMyInfo: "Edit My Information",
  linkExpired: "Link has expired",
  linkExpiresIn: "Link expires in",
  assistance: "For any assistance, please contact reception.",
  enjoyStay: "Enjoy your stay at Pelangi Capsule Hostel! 💼🌟",

  validatingLink: "Validating check-in link...",
  invalidLink: "Invalid Link",
  invalidLinkDesc: "This check-in link is invalid or missing a token.",
  expiredLink: "Invalid or Expired Link", 
  expiredLinkDesc: "This check-in link is invalid or has expired.",
  error: "Error",
  validationError: "Failed to validate check-in link.",
  checkInFailed: "Check-in Failed",
  checkInSuccess: "Check-in Successful!",
  checkInSuccessDesc: "Welcome to Pelangi Capsule Hostel! You've been assigned to",

  selectLanguage: "Select Language",
  currentLanguage: "English",
  
      printCheckInSlip: "Print",
    saveAsPdf: "Save",
  sendToEmail: "Send to Email",
  emailAddress: "Email Address",
  invalidEmail: "Invalid Email",
  pleaseEnterValidEmail: "Please enter a valid email address",
  cancel: "Cancel",
  sendCheckInSlipEmail: "Send Check-in Slip to Email",
  enterEmailForSlip: "Enter the email address where you'd like to receive your check-in slip.",
  emailAddress: "Email Address",
  sendEmail: "Send Email",
  cancel: "Cancel",
  invalidEmail: "Invalid Email",
  pleaseEnterValidEmail: "Please enter a valid email address",
  emailSent: "Email Sent",
  checkInSlipSentTo: "Check-in slip has been sent to"
,
  tipsTitle: "Tips to complete this form quickly",
  tipHaveDocument: "Have your IC or passport ready. You only need one of them.",
  tipPhoneFormat: "Phone number should include country code, e.g., +60 for Malaysia.",
  tipGenderPrivacy: "If you prefer privacy, choose “Other” or “Prefer not to say” for Gender.",
  tipLanguageSwitch: "You can change language anytime using the globe icon above.",

  photoTipsTitle: "Photo tips",
  photoTipLighting: "Use good lighting and ensure the whole document is clearly visible.",
  photoTipGlare: "Avoid glare and blur. Hold your phone steady.",
  photoTipSize: "Accepted file size up to 15MB. One clear photo is enough.",

  nameHint: "Use the same spelling as your IC or passport.",
  phoneHint: "Include country code (e.g., +60 for Malaysia, +65 for Singapore).",
  genderHint: "Choose what you are most comfortable with. This helps us recommend a suitable capsule area.",
  nationalityHint: "Start typing to search your nationality in the list.",
  icHint: "Malaysians: 12 digits without dashes. Example: 881014015523.",
  passportHint: "Foreigners: Use the full passport number as printed on the document.",
  photoHint: "Make sure your name and number are readable. If the preview looks blurry, retake the photo.",
  emergencyContactHint: "Optional but helpful. A local contact makes it easier for us to reach someone in case of emergency.",
  emergencyPhoneHint: "Include country code (e.g., +60). You can enter your own number if no other person is available.",
  notesHint: "Example: “I will arrive late at 11:30 PM”, “Allergic to peanuts”, “Need lower/bottom capsule if possible”.",
  paymentMethodHint: "Choose how you plan to pay. You can confirm details on arrival.",
  cashDescriptionHint: "If you already paid in cash to our staff, tell us who took the payment. Otherwise, you can leave this blank.",

  faqNeedHelp: "Need help filling this form?",
  faqIntro: "Common questions and quick answers:",
  faqIcVsPassportQ: "Do I need both IC and passport?",
  faqIcVsPassportA: "No. You only need to provide one of them. If you enter your IC, the passport field is not required and will be disabled, and vice versa.",
  faqPhotoUploadQ: "My photo won’t upload — what can I do?",
  faqPhotoUploadA: "Make sure the file is under 15MB. We support HEIC/HEIF (iPhone), JPG, PNG, and WEBP. Ensure a stable internet connection. If it still fails, try taking the photo again or switching to JPEG in your camera settings.",
  faqPhoneFormatQ: "How should I write my phone number?",
  faqPhoneFormatA: "Include your country code, for example +60 for Malaysia or +65 for Singapore. Dashes/spaces are okay.",
  faqGenderWhyQ: "Why do you ask for gender?",
  faqGenderWhyA: "We use gender only to recommend a suitable capsule area (e.g., back/front or top/bottom). You may choose “Other” or “Prefer not to say”.",
  faqPrivacyQ: "Is my information private?",
  faqPrivacyA: "Yes. Your information is used only for your stay and legal compliance. We do not share your documents publicly.",
  faqEditAfterQ: "Can I edit my information after submitting?",
  faqEditAfterA: "Yes, you can edit within 1 hour after successful check‑in using the link provided on the success page."
  ,
  commonNotesTitle: "Quick add common notes:",
  commonNoteLateArrival: "I will arrive late (after 11:00 PM)",
  commonNoteArriveEarly: "I will arrive early (before 3:00 PM)",
  commonNoteBottomCapsule: "Prefer bottom capsule if possible",
  commonNoteQuietArea: "Prefer quiet area if available",
  commonNoteExtraBedding: "Request for extra blanket",
};

// Malay translations
const msTranslations: Translations = {
  welcomeTitle: "Selamat Datang ke Pelangi Capsule Hostel",
  completeCheckIn: "Lengkapkan maklumat daftar masuk anda",
  assignedCapsule: "Kapsul yang ditetapkan untuk anda",
  prefilledInfo: "Maklumat Pra-diisi:",

  personalInfo: "Maklumat Peribadi",
  fullNameLabel: "Nama Penuh seperti dalam IC/Pasport *",
  fullNamePlaceholder: "Masukkan nama anda seperti yang ditunjukkan dalam ID",
  contactNumberLabel: "Nombor Hubungan *",
  contactNumberPlaceholder: "Masukkan nombor hubungan anda (cth: +60123456789)",
  genderLabel: "Jantina *",
  genderPlaceholder: "Pilih jantina",
  male: "Lelaki",
  female: "Perempuan",
  nationalityLabel: "Kewarganegaraan *",
  nationalityPlaceholder: "cth: Malaysia, Singapura",

  identityDocs: "Dokumen Pengenalan *",
  identityDocsDesc: "Sila berikan maklumat IC atau Pasport dengan foto dokumen:",
  icNumberLabel: "Nombor IC (untuk rakyat Malaysia)",
  icNumberPlaceholder: "cth: 950101-01-1234",
  passportNumberLabel: "Nombor Pasport (untuk warga asing)",
  passportNumberPlaceholder: "cth: A12345678",
  icPhotoLabel: "Foto Dokumen IC",
  icPhotoDesc: "Muat naik foto IC anda",
  passportPhotoLabel: "Foto Dokumen Pasport",
  passportPhotoDesc: "Muat naik foto pasport anda",
  chooseFile: "Pilih Fail",

  paymentMethod: "Kaedah Pembayaran *",
  paymentMethodPlaceholder: "Pilih kaedah pembayaran pilihan",
  cash: "Tunai",
  card: "Kad Kredit/Debit",
  onlineTransfer: "Pemindahan Online",
  paymentNote: "Pembayaran akan dikutip di meja depan semasa ketibaan",

  completeCheckInBtn: "Lengkapkan Daftar Masuk",
  completingCheckIn: "Melengkapkan Daftar Masuk...",
  editInfo: "Edit Maklumat Saya",

  goodDay: "Selamat Datang, Tetamu Terhormat Kami!",
  welcomeHostel: "Selamat Datang ke Pelangi Capsule Hostel",
  address: "Alamat:",
  hostelPhotos: "📸 Foto Hostel",
  googleMaps: "📍 Google Maps",
  checkInVideo: "🎥 Video Daftar Masuk",
  checkInTime: "Daftar Masuk: Dari 3:00 PM",
  checkOutTime: "Daftar Keluar: Sebelum 12:00 PM",
  doorPassword: "Kata Laluan Pintu:",
  capsuleNumber: "Nombor Kapsul Anda:",
  accessCard: "Kad Akses Kapsul: Diletakkan di atas bantal anda",
  importantReminders: "Peringatan Penting:",
  noCardWarning: "🚫 Jangan tinggalkan kad anda di dalam kapsul dan tutup pintu",
  noSmoking: "🚭 Dilarang Merokok di kawasan hostel",
  cctvWarning: "🎥 Dipantau CCTV – Pelanggaran (cth: merokok) boleh dikenakan denda RM300",
  infoEditable: "Maklumat Boleh Diedit",
  editUntil: "Anda boleh edit maklumat daftar masuk sehingga",
  editMyInfo: "Edit Maklumat Saya",
  linkExpired: "Pautan telah tamat tempoh",
  linkExpiresIn: "Pautan tamat tempoh dalam",
  assistance: "Untuk sebarang bantuan, sila hubungi kaunter penerimaan.",
  enjoyStay: "Nikmati penginapan anda di Pelangi Capsule Hostel! 💼🌟",

  validatingLink: "Mengesahkan pautan daftar masuk...",
  invalidLink: "Pautan Tidak Sah",
  invalidLinkDesc: "Pautan daftar masuk ini tidak sah atau tiada token.",
  expiredLink: "Pautan Tidak Sah atau Tamat Tempoh",
  expiredLinkDesc: "Pautan daftar masuk ini tidak sah atau telah tamat tempoh.",
  error: "Ralat",
  validationError: "Gagal untuk mengesahkan pautan daftar masuk.",
  checkInFailed: "Daftar Masuk Gagal",
  checkInSuccess: "Daftar Masuk Berjaya!",
  checkInSuccessDesc: "Selamat datang ke Pelangi Capsule Hostel! Anda telah ditetapkan ke",

  selectLanguage: "Pilih Bahasa",
  currentLanguage: "Bahasa Malaysia",
  
      printCheckInSlip: "Cetak",
    saveAsPdf: "Simpan",
  sendToEmail: "Hantar ke E-mel",
  emailAddress: "Alamat E-mel",
  invalidEmail: "E-mel Tidak Sah",
  pleaseEnterValidEmail: "Sila masukkan alamat e-mel yang sah",
  cancel: "Batal",
  sendCheckInSlipEmail: "Hantar Slip Daftar Masuk ke E-mel",
  enterEmailForSlip: "Masukkan alamat e-mel di mana anda ingin menerima slip daftar masuk anda.",
  emailAddress: "Alamat E-mel",
  sendEmail: "Hantar E-mel",
  cancel: "Batal",
  invalidEmail: "E-mel Tidak Sah",
  pleaseEnterValidEmail: "Sila masukkan alamat e-mel yang sah",
  emailSent: "E-mel Dihantar",
  checkInSlipSentTo: "Slip daftar masuk telah dihantar ke"
,
  tipsTitle: "Tip untuk melengkapkan borang dengan cepat",
  tipHaveDocument: "Sediakan IC atau pasport anda. Salah satu sudah mencukupi.",
  tipPhoneFormat: "Nombor telefon hendaklah ada kod negara, contoh: +60 untuk Malaysia.",
  tipGenderPrivacy: "Jika mahu privasi, pilih “Lain-lain” atau “Tidak mahu dinyatakan” untuk Jantina.",
  tipLanguageSwitch: "Anda boleh tukar bahasa pada bila-bila masa menggunakan ikon glob di atas.",

  photoTipsTitle: "Tip foto",
  photoTipLighting: "Pastikan pencahayaan baik dan keseluruhan dokumen jelas kelihatan.",
  photoTipGlare: "Elakkan silau dan kabur. Pegang telefon dengan stabil.",
  photoTipSize: "Saiz fail diterima sehingga 15MB. Satu foto yang jelas sudah mencukupi.",

  nameHint: "Gunakan ejaan yang sama seperti dalam IC atau pasport.",
  phoneHint: "Sertakan kod negara (cth., +60 untuk Malaysia, +65 untuk Singapura).",
  genderHint: "Pilih pilihan yang paling selesa. Ini membantu kami mengesyorkan kawasan kapsul yang sesuai.",
  nationalityHint: "Mula menaip untuk cari kewarganegaraan anda dalam senarai.",
  icHint: "Rakyat Malaysia: 12 digit tanpa sengkang. Contoh: 881014015523.",
  passportHint: "Warga asing: Gunakan nombor pasport penuh seperti pada dokumen.",
  photoHint: "Pastikan nama dan nombor boleh dibaca. Jika pratonton kabur, ambil semula foto.",
  emergencyContactHint: "Pilihan tetapi membantu. Hubungan tempatan memudahkan kami menghubungi seseorang semasa kecemasan.",
  emergencyPhoneHint: "Sertakan kod negara (cth., +60). Anda boleh masukkan nombor sendiri jika tiada orang lain.",
  notesHint: "Contoh: “Saya tiba lewat jam 11:30 malam”, “Alergi kacang”, “Perlu kapsul bawah jika boleh”.",
  paymentMethodHint: "Pilih cara bayaran anda. Anda boleh sahkan semasa ketibaan.",
  cashDescriptionHint: "Jika sudah bayar tunai kepada staf kami, beritahu siapa penerima bayaran. Jika tidak, boleh kosongkan.",

  faqNeedHelp: "Perlukan bantuan mengisi borang?",
  faqIntro: "Soalan lazim dan jawapan ringkas:",
  faqIcVsPassportQ: "Perlu kedua-dua IC dan pasport?",
  faqIcVsPassportA: "Tidak. Hanya satu diperlukan. Jika isi IC, medan pasport tidak perlu dan akan dilumpuhkan, dan sebaliknya.",
  faqPhotoUploadQ: "Foto tidak boleh dimuat naik — apa perlu dibuat?",
  faqPhotoUploadA: "Pastikan saiz fail di bawah 15MB. Kami sokong HEIC/HEIF (iPhone), JPG, PNG dan WEBP. Pastikan talian internet stabil. Jika masih gagal, cuba ambil semula atau tukar kepada JPEG.",
  faqPhoneFormatQ: "Bagaimana format nombor telefon?",
  faqPhoneFormatA: "Sertakan kod negara, contoh +60 untuk Malaysia atau +65 untuk Singapura. Tanda sengkang/ruang dibenarkan.",
  faqGenderWhyQ: "Mengapa minta jantina?",
  faqGenderWhyA: "Kami gunakan jantina hanya untuk mengesyorkan kawasan kapsul yang sesuai. Anda boleh pilih “Lain-lain” atau “Tidak mahu dinyatakan”.",
  faqPrivacyQ: "Adakah maklumat saya sulit?",
  faqPrivacyA: "Ya. Maklumat anda digunakan untuk penginapan dan pematuhan undang-undang sahaja. Kami tidak berkongsi dokumen anda secara umum.",
  faqEditAfterQ: "Boleh edit selepas hantar?",
  faqEditAfterA: "Boleh, dalam masa 1 jam selepas daftar masuk berjaya menggunakan pautan di halaman kejayaan."
  ,
  commonNotesTitle: "Tambah nota biasa dengan cepat:",
  commonNoteLateArrival: "Saya akan tiba lewat (selepas 11:00 malam)",
  commonNoteArriveEarly: "Saya akan tiba awal (sebelum 3:00 petang)",
  commonNoteBottomCapsule: "Prefer kapsul bawah jika boleh",
  commonNoteQuietArea: "Prefer kawasan yang senyap jika ada",
  commonNoteExtraBedding: "Minta selimut tambahan",
};

// Chinese translations
const zhTranslations: Translations = {
  welcomeTitle: "欢迎来到彩虹胶囊旅舍",
  completeCheckIn: "完成您的入住信息",
  assignedCapsule: "您被分配的胶囊",
  prefilledInfo: "预填信息:",

  personalInfo: "个人信息",
  fullNameLabel: "身份证/护照上的全名 *",
  fullNamePlaceholder: "输入身份证件上显示的姓名",
  contactNumberLabel: "联系电话 *",
  contactNumberPlaceholder: "输入您的联系电话 (例如: +60123456789)",
  genderLabel: "性别 *",
  genderPlaceholder: "选择性别",
  male: "男性",
  female: "女性",
  nationalityLabel: "国籍 *",
  nationalityPlaceholder: "例如: 马来西亚, 新加坡",

  identityDocs: "身份证件 *",
  identityDocsDesc: "请提供身份证或护照信息以及证件照片:",
  icNumberLabel: "身份证号码 (马来西亚人)",
  icNumberPlaceholder: "例如: 950101-01-1234",
  passportNumberLabel: "护照号码 (外国人)",
  passportNumberPlaceholder: "例如: A12345678",
  icPhotoLabel: "身份证照片",
  icPhotoDesc: "上传您的身份证照片",
  passportPhotoLabel: "护照照片",
  passportPhotoDesc: "上传您的护照照片",
  chooseFile: "选择文件",

  paymentMethod: "付款方式 *",
  paymentMethodPlaceholder: "选择首选付款方式",
  cash: "现金",
  card: "信用卡/借记卡",
  onlineTransfer: "网上转账",
  paymentNote: "到达时将在前台收取付款",

  completeCheckInBtn: "完成入住",
  completingCheckIn: "正在完成入住...",
  editInfo: "编辑我的信息",

  goodDay: "您好，我们尊贵的客人！",
  welcomeHostel: "欢迎来到彩虹胶囊旅舍",
  address: "地址:",
  hostelPhotos: "📸 旅舍照片",
  googleMaps: "📍 谷歌地图",
  checkInVideo: "🎥 入住视频",
  checkInTime: "入住: 下午3:00开始",
  checkOutTime: "退房: 上午12:00之前",
  doorPassword: "门密码:",
  capsuleNumber: "您的胶囊号码:",
  accessCard: "胶囊门卡: 放在您的枕头上",
  importantReminders: "重要提醒:",
  noCardWarning: "🚫 请勿将门卡留在胶囊内并关闭门",
  noSmoking: "🚭 旅舍区域内禁止吸烟",
  cctvWarning: "🎥 有监控摄像头 - 违规行为(如吸烟)可能被罚款300马币",
  infoEditable: "信息可编辑",
  editUntil: "您可以编辑入住信息直到",
  editMyInfo: "编辑我的信息",
  linkExpired: "链接已过期",
  linkExpiresIn: "链接将在以下时间后过期",
  assistance: "如需任何帮助，请联系前台。",
  enjoyStay: "祝您在彩虹胶囊旅舍住宿愉快！💼🌟",

  validatingLink: "验证入住链接中...",
  invalidLink: "无效链接",
  invalidLinkDesc: "此入住链接无效或缺少令牌。",
  expiredLink: "无效或过期链接",
  expiredLinkDesc: "此入住链接无效或已过期。",
  error: "错误",
  validationError: "验证入住链接失败。",
  checkInFailed: "入住失败",
  checkInSuccess: "入住成功！",
  checkInSuccessDesc: "欢迎来到彩虹胶囊旅舍！您已被分配到",

  selectLanguage: "选择语言",
  currentLanguage: "简体中文"
,
  tipsTitle: "快速完成表单的小贴士",
  tipHaveDocument: "准备好身份证或护照，两者其一即可。",
  tipPhoneFormat: "手机号应包含国家区号，例如马来西亚 +60。",
  tipGenderPrivacy: "若注重隐私，可选择“其他”或“不便透露”作为性别。",
  tipLanguageSwitch: "可随时点击上方地球图标切换语言。",

  photoTipsTitle: "拍照提示",
  photoTipLighting: "使用良好光线，确保整张证件清晰可见。",
  photoTipGlare: "避免反光与模糊，保持手机稳定。",
  photoTipSize: "文件大小上限 15MB，一张清晰照片即可。",

  nameHint: "姓名请与身份证/护照一致。",
  phoneHint: "请包含国家区号（如 +60 马来西亚，+65 新加坡）。",
  genderHint: "请选择您最舒适的选项，仅用于推荐合适的舱位区域。",
  nationalityHint: "开始输入即可在列表中搜索您的国籍。",
  icHint: "马来西亚公民：12 位数字，不含横杠。如 881014015523。",
  passportHint: "外国旅客：使用护照上完整号码。",
  photoHint: "确保姓名和号码清晰可读。若预览模糊，请重新拍摄。",
  emergencyContactHint: "可选但有帮助。本地联系人便于我们在紧急情况下联系到人。",
  emergencyPhoneHint: "请包含国家区号（如 +60）。若无他人可填，可先填写您本人号码。",
  notesHint: "示例：“我将于 23:30 到达”、“花生过敏”、“如可，请安排下铺”。",
  paymentMethodHint: "请选择您计划的付款方式。到店后可再确认。",
  cashDescriptionHint: "若已向员工现金付款，请说明收款人；否则可留空。",

  faqNeedHelp: "需要填写帮助吗？",
  faqIntro: "常见问题与快速解答：",
  faqIcVsPassportQ: "是否必须同时提供身份证和护照？",
  faqIcVsPassportA: "不需要。两者其一即可。填写身份证后，护照字段会被禁用，反之亦然。",
  faqPhotoUploadQ: "照片无法上传怎么办？",
  faqPhotoUploadA: "请确认文件小于 15MB。支持 HEIC/HEIF（iPhone）、JPG、PNG、WEBP。确保网络稳定。如仍失败，重拍或在相机设置改为 JPEG。",
  faqPhoneFormatQ: "手机号该如何填写？",
  faqPhoneFormatA: "请包含国家区号，如 +60（马来西亚）或 +65（新加坡）。可包含横杠或空格。",
  faqGenderWhyQ: "为什么需要性别？",
  faqGenderWhyA: "仅用于推荐合适舱位区域（如前/后、上/下铺）。您也可选择“其他”或“不便透露”。",
  faqPrivacyQ: "我的信息是否保密？",
  faqPrivacyA: "是。仅用于住宿与合规，不会公开分享您的证件。",
  faqEditAfterQ: "提交后还能修改吗？",
  faqEditAfterA: "可以。成功入住后 1 小时内可通过成功页提供的链接进行修改。"
  ,
  commonNotesTitle: "快速添加常见备注：",
  commonNoteLateArrival: "我会晚到（晚上 11 点后）",
  commonNoteArriveEarly: "我会提早到达（下午 3 点前）",
  commonNoteBottomCapsule: "如可，优先安排下铺",
  commonNoteQuietArea: "如可，优先安排安静区域",
  commonNoteExtraBedding: "需要额外毛毯",
  
  // Print and Email
  printCheckInSlip: "打印",
  saveAsPdf: "保存",
  sendToEmail: "发送到邮箱",
  sendCheckInSlipEmail: "发送入住单到邮箱",
  
  // Email and validation
  emailAddress: "邮箱地址",
  invalidEmail: "无效邮箱",
  pleaseEnterValidEmail: "请输入有效的邮箱地址",
  cancel: "取消",
};

// Spanish translations
const esTranslations: Translations = {
  welcomeTitle: "Bienvenido a Pelangi Capsule Hostel",
  completeCheckIn: "Complete su información de registro",
  assignedCapsule: "Su cápsula asignada",
  prefilledInfo: "Información Pre-rellenada:",

  personalInfo: "Información Personal",
  fullNameLabel: "Nombre Completo según ID/Pasaporte *",
  fullNamePlaceholder: "Ingrese su nombre como aparece en el ID",
  contactNumberLabel: "Número de Contacto *",
  contactNumberPlaceholder: "Ingrese su número de contacto (ej: +60123456789)",
  genderLabel: "Género *",
  genderPlaceholder: "Seleccionar género",
  male: "Masculino",
  female: "Femenino",
  nationalityLabel: "Nacionalidad *",
  nationalityPlaceholder: "ej: Malasio, Singapurense",

  identityDocs: "Documentos de Identidad *",
  identityDocsDesc: "Proporcione información de ID o Pasaporte con foto del documento:",
  icNumberLabel: "Número de ID (para malasios)",
  icNumberPlaceholder: "ej: 950101-01-1234",
  passportNumberLabel: "Número de Pasaporte (para extranjeros)",
  passportNumberPlaceholder: "ej: A12345678",
  icPhotoLabel: "Foto del Documento ID",
  icPhotoDesc: "Subir foto de su ID",
  passportPhotoLabel: "Foto del Documento Pasaporte",
  passportPhotoDesc: "Subir foto de su pasaporte",
  chooseFile: "Elegir Archivo",

  paymentMethod: "Método de Pago *",
  paymentMethodPlaceholder: "Seleccionar método de pago preferido",
  cash: "Efectivo",
  card: "Tarjeta de Crédito/Débito",
  onlineTransfer: "Transferencia Online",
  paymentNote: "El pago se cobrará en recepción al llegar",

  completeCheckInBtn: "Completar Registro",
  completingCheckIn: "Completando Registro...",
  editInfo: "Editar Mi Información",

  goodDay: "¡Buen día, Nuestro Honorable Huésped!",
  welcomeHostel: "Bienvenido a Pelangi Capsule Hostel",
  address: "Dirección:",
  hostelPhotos: "📸 Fotos del Hostel",
  googleMaps: "📍 Google Maps",
  checkInVideo: "🎥 Video de Registro",
  checkInTime: "Registro: Desde las 3:00 PM",
  checkOutTime: "Salida: Antes de las 12:00 PM",
  doorPassword: "Contraseña de la Puerta:",
  capsuleNumber: "Su Número de Cápsula:",
  accessCard: "Tarjeta de Acceso a Cápsula: Colocada en su almohada",
  importantReminders: "Recordatorios Importantes:",
  noCardWarning: "🚫 No deje su tarjeta dentro de la cápsula y cierre la puerta",
  noSmoking: "🚭 No Fumar en el área del hostel",
  cctvWarning: "🎥 Monitoreado por CCTV – Violación (ej: fumar) puede resultar en multa de RM300",
  infoEditable: "Información Editable",
  editUntil: "Puede editar su información de registro hasta",
  editMyInfo: "Editar Mi Información",
  linkExpired: "El enlace ha expirado",
  linkExpiresIn: "El enlace expira en",
  assistance: "Para cualquier asistencia, por favor contacte recepción.",
  enjoyStay: "¡Disfrute su estadía en Pelangi Capsule Hostel! 💼🌟",

  validatingLink: "Validando enlace de registro...",
  invalidLink: "Enlace Inválido",
  invalidLinkDesc: "Este enlace de registro es inválido o le falta un token.",
  expiredLink: "Enlace Inválido o Expirado",
  expiredLinkDesc: "Este enlace de registro es inválido o ha expirado.",
  error: "Error",
  validationError: "Falló la validación del enlace de registro.",
  checkInFailed: "Registro Fallido",
  checkInSuccess: "¡Registro Exitoso!",
  checkInSuccessDesc: "¡Bienvenido a Pelangi Capsule Hostel! Ha sido asignado a",

  selectLanguage: "Seleccionar Idioma",
  currentLanguage: "Español"
,
  tipsTitle: "Consejos para completar el formulario rápidamente",
  tipHaveDocument: "Tenga a mano su DNI o pasaporte. Solo necesita uno.",
  tipPhoneFormat: "El número debe incluir el prefijo internacional, por ejemplo +60 para Malasia.",
  tipGenderPrivacy: "Si prefiere privacidad, elija “Otro” o “Prefiero no decirlo” en Género.",
  tipLanguageSwitch: "Puede cambiar el idioma en cualquier momento con el icono del globo.",

  photoTipsTitle: "Consejos de foto",
  photoTipLighting: "Use buena iluminación y asegúrese de que el documento sea claramente visible.",
  photoTipGlare: "Evite reflejos y desenfoques. Mantenga el teléfono estable.",
  photoTipSize: "Tamaño aceptado hasta 15MB. Una foto clara es suficiente.",

  nameHint: "Use la misma escritura que aparece en su DNI/pasaporte.",
  phoneHint: "Incluya el prefijo internacional (ej.: +60 Malasia, +65 Singapur).",
  genderHint: "Elija lo que le resulte más cómodo. Nos ayuda a recomendar un área de cápsulas adecuada.",
  nationalityHint: "Empiece a escribir para buscar su nacionalidad en la lista.",
  icHint: "Malasia: 12 dígitos sin guiones. Ej.: 881014015523.",
  passportHint: "Extranjeros: Use el número completo tal como aparece en el pasaporte.",
  photoHint: "Asegúrese de que el nombre y el número sean legibles. Si está borroso, vuelva a tomar la foto.",
  emergencyContactHint: "Opcional pero útil. Un contacto local facilita la comunicación en emergencias.",
  emergencyPhoneHint: "Incluya el prefijo (ej.: +60). Si no tiene otro contacto, puede ingresar su propio número.",
  notesHint: "Ej.: “Llegaré tarde a las 23:30”, “Alérgico a cacahuetes”, “Prefiero cápsula inferior si es posible”.",
  paymentMethodHint: "Elija cómo planea pagar. Puede confirmarlo al llegar.",
  cashDescriptionHint: "Si ya pagó en efectivo a nuestro personal, indique a quién. De lo contrario, deje en blanco.",

  faqNeedHelp: "¿Necesita ayuda para completar el formulario?",
  faqIntro: "Preguntas frecuentes y respuestas rápidas:",
  faqIcVsPassportQ: "¿Necesito DNI y pasaporte?",
  faqIcVsPassportA: "No. Solo debe proporcionar uno. Si ingresa el DNI, el campo de pasaporte no es necesario y se deshabilita, y viceversa.",
  faqPhotoUploadQ: "Mi foto no se carga, ¿qué hago?",
  faqPhotoUploadA: "Asegúrese de que el archivo pese menos de 15MB. Soportamos HEIC/HEIF (iPhone), JPG, PNG y WEBP. Verifique su conexión. Si persiste, tome otra foto o cambie a JPEG.",
  faqPhoneFormatQ: "¿Cómo debo escribir mi número de teléfono?",
  faqPhoneFormatA: "Incluya el prefijo internacional, por ejemplo +60 (Malasia) o +65 (Singapur). Puede usar guiones/espacios.",
  faqGenderWhyQ: "¿Por qué piden género?",
  faqGenderWhyA: "Solo para recomendar un área de cápsulas adecuada (p. ej., frente/atrás o arriba/abajo). Puede elegir “Otro” o “Prefiero no decirlo”.",
  faqPrivacyQ: "¿Mi información es privada?",
  faqPrivacyA: "Sí. Usamos su información solo para su estadía y cumplimiento legal. No compartimos sus documentos públicamente.",
  faqEditAfterQ: "¿Puedo editar después de enviar?",
  faqEditAfterA: "Sí, dentro de 1 hora después del check‑in exitoso usando el enlace de la página de éxito."
  ,
  commonNotesTitle: "Agregar notas comunes rápidamente:",
  commonNoteLateArrival: "Llegaré tarde (después de las 11:00 PM)",
  commonNoteArriveEarly: "Llegaré temprano (antes de las 3:00 PM)",
  commonNoteBottomCapsule: "Prefiero cápsula inferior si es posible",
  commonNoteQuietArea: "Prefiero zona tranquila si está disponible",
  commonNoteExtraBedding: "Solicito manta adicional",
};

// Japanese translations
const jaTranslations: Translations = {
  welcomeTitle: "ペランギカプセルホステルへようこそ",
  completeCheckIn: "チェックイン情報を完了してください",
  assignedCapsule: "割り当てられたカプセル",
  prefilledInfo: "事前入力情報:",

  personalInfo: "個人情報",
  fullNameLabel: "身分証明書/パスポート記載の氏名 *",
  fullNamePlaceholder: "IDに記載されている氏名を入力してください",
  contactNumberLabel: "連絡先番号 *",
  contactNumberPlaceholder: "連絡先番号を入力してください (例: +60123456789)",
  genderLabel: "性別 *",
  genderPlaceholder: "性別を選択",
  male: "男性",
  female: "女性",
  nationalityLabel: "国籍 *",
  nationalityPlaceholder: "例: マレーシア、シンガポール",

  identityDocs: "身分証明書 *",
  identityDocsDesc: "IDまたはパスポート情報と書類の写真を提供してください:",
  icNumberLabel: "ID番号 (マレーシア人用)",
  icNumberPlaceholder: "例: 950101-01-1234",
  passportNumberLabel: "パスポート番号 (外国人用)",
  passportNumberPlaceholder: "例: A12345678",
  icPhotoLabel: "ID書類写真",
  icPhotoDesc: "IDの写真をアップロード",
  passportPhotoLabel: "パスポート書類写真",
  passportPhotoDesc: "パスポートの写真をアップロード",
  chooseFile: "ファイルを選択",

  paymentMethod: "支払い方法 *",
  paymentMethodPlaceholder: "希望する支払い方法を選択",
  cash: "現金",
  card: "クレジット/デビットカード",
  onlineTransfer: "オンライン振込",
  paymentNote: "到着時にフロントデスクで支払いを徴収します",

  completeCheckInBtn: "チェックイン完了",
  completingCheckIn: "チェックインを完了中...",
  editInfo: "情報を編集",

  goodDay: "こんにちは、私たちの大切なお客様！",
  welcomeHostel: "ペランギカプセルホステルへようこそ",
  address: "住所:",
  hostelPhotos: "📸 ホステル写真",
  googleMaps: "📍 グーグルマップ",
  checkInVideo: "🎥 チェックインビデオ",
  checkInTime: "チェックイン: 午後3:00から",
  checkOutTime: "チェックアウト: 午後12:00まで",
  doorPassword: "ドアパスワード:",
  capsuleNumber: "あなたのカプセル番号:",
  accessCard: "カプセルアクセスカード: 枕の上に置いてあります",
  importantReminders: "重要な注意事項:",
  noCardWarning: "🚫 カードをカプセル内に置いたままドアを閉めないでください",
  noSmoking: "🚭 ホステルエリア内禁煙",
  cctvWarning: "🎥 CCTV監視中 – 違反行為(喫煙など)はRM300の罰金が科される場合があります",
  infoEditable: "情報編集可能",
  editUntil: "チェックイン情報は次の時間まで編集できます",
  editMyInfo: "情報を編集",
  linkExpired: "リンクの有効期限が切れました",
  linkExpiresIn: "リンクの有効期限",
  assistance: "ご不明な点がございましたら、フロントまでお問い合わせください。",
  enjoyStay: "ペランギカプセルホステルでのご滞在をお楽しみください！💼🌟",

  validatingLink: "チェックインリンクを検証中...",
  invalidLink: "無効なリンク",
  invalidLinkDesc: "このチェックインリンクは無効またはトークンが不足しています。",
  expiredLink: "無効または期限切れのリンク",
  expiredLinkDesc: "このチェックインリンクは無効または期限切れです。",
  error: "エラー",
  validationError: "チェックインリンクの検証に失敗しました。",
  checkInFailed: "チェックイン失敗",
  checkInSuccess: "チェックイン成功！",
  checkInSuccessDesc: "ペランギカプセルホステルへようこそ！",

  selectLanguage: "言語を選択",
  currentLanguage: "日本語"
,
  tipsTitle: "素早く入力するためのヒント",
  tipHaveDocument: "IC（身分証）またはパスポートのどちらかをご用意ください。どちらか一方で十分です。",
  tipPhoneFormat: "電話番号は国番号を含めて入力してください（例：マレーシア +60）。",
  tipGenderPrivacy: "プライバシー重視の方は「その他」または「無回答」を選べます。",
  tipLanguageSwitch: "上部の地球アイコンから言語をいつでも切替可能です。",

  photoTipsTitle: "写真のコツ",
  photoTipLighting: "明るい場所で、書類全体がはっきり写るようにしてください。",
  photoTipGlare: "反射やブレを避け、スマホを安定させてください。",
  photoTipSize: "最大 15MB まで対応。鮮明な写真1枚で十分です。",

  nameHint: "IC/パスポートと同じ表記で入力してください。",
  phoneHint: "国番号を含めて入力（例：+60、+65）。",
  genderHint: "最も安心できる選択をしてください。適切なカプセルエリアの提案に使います。",
  nationalityHint: "入力すると国籍候補を検索できます。",
  icHint: "マレーシア市民：ハイフンなし 12 桁（例：881014015523）。",
  passportHint: "外国籍：パスポート記載の番号をそのまま入力。",
  photoHint: "氏名と番号が読めるか確認。ぼやけていたら撮り直してください。",
  emergencyContactHint: "任意ですが便利です。緊急時に連絡先があると助かります。",
  emergencyPhoneHint: "国番号を含めて入力（例：+60）。他にいなければご自身の番号でOKです。",
  notesHint: "例：「23:30 到着」「ピーナッツアレルギー」「可能なら下段を希望」など。",
  paymentMethodHint: "予定している支払い方法を選択。到着後に確定でもOKです。",
  cashDescriptionHint: "すでに現金で支払い済みの場合は、受け取ったスタッフ名を記載。未払いなら空欄で構いません。",

  faqNeedHelp: "入力の手助けが必要ですか？",
  faqIntro: "よくある質問と回答：",
  faqIcVsPassportQ: "IC とパスポートは両方必要？",
  faqIcVsPassportA: "いいえ。どちらか一方で構いません。IC を入力するとパスポート欄は不要となり無効化されます（逆も同様）。",
  faqPhotoUploadQ: "写真をアップできないときは？",
  faqPhotoUploadA: "ファイルは 15MB 以下にしてください。HEIC/HEIF（iPhone）、JPG、PNG、WEBP に対応。通信環境を確認し、だめなら再撮影や JPEG への切替をお試しください。",
  faqPhoneFormatQ: "電話番号の書き方は？",
  faqPhoneFormatA: "国番号を含めて入力。例：+60（マレーシア）や +65（シンガポール）。ハイフン/スペース可。",
  faqGenderWhyQ: "なぜ性別を聞くの？",
  faqGenderWhyA: "適切なカプセル配置を提案するためだけに使用します。「その他」や「無回答」も選べます。",
  faqPrivacyQ: "個人情報は安全？",
  faqPrivacyA: "はい。滞在と法令順守のためだけに使用し、書類を公開することはありません。",
  faqEditAfterQ: "送信後に編集できる？",
  faqEditAfterA: "可能です。成功後 1 時間以内なら、成功ページのリンクから編集できます。"
  ,
  commonNotesTitle: "よくある要望を素早く追加：",
  commonNoteLateArrival: "到着が遅くなります（23:00以降）",
  commonNoteArriveEarly: "早めに到着します（15:00 前）",
  commonNoteBottomCapsule: "可能なら下段を希望",
  commonNoteQuietArea: "可能なら静かなエリアを希望",
  commonNoteExtraBedding: "毛布の追加を希望",
};

// Korean translations
const koTranslations: Translations = {
  welcomeTitle: "펠랑이 캡슐 호스텔에 오신 것을 환영합니다",
  completeCheckIn: "체크인 정보를 완료해주세요",
  assignedCapsule: "배정된 캡슐",
  prefilledInfo: "미리 입력된 정보:",

  personalInfo: "개인정보",
  fullNameLabel: "신분증/여권상 실명 *",
  fullNamePlaceholder: "신분증에 기재된 이름을 입력하세요",
  contactNumberLabel: "연락처 *",
  contactNumberPlaceholder: "연락처를 입력하세요 (예: +60123456789)",
  genderLabel: "성별 *",
  genderPlaceholder: "성별 선택",
  male: "남성",
  female: "여성",
  nationalityLabel: "국적 *",
  nationalityPlaceholder: "예: 말레이시아, 싱가포르",

  identityDocs: "신분증명서 *",
  identityDocsDesc: "신분증 또는 여권 정보와 서류 사진을 제공해주세요:",
  icNumberLabel: "신분증 번호 (말레이시아인용)",
  icNumberPlaceholder: "예: 950101-01-1234",
  passportNumberLabel: "여권번호 (외국인용)",
  passportNumberPlaceholder: "예: A12345678",
  icPhotoLabel: "신분증 서류 사진",
  icPhotoDesc: "신분증 사진 업로드",
  passportPhotoLabel: "여권 서류 사진",
  passportPhotoDesc: "여권 사진 업로드",
  chooseFile: "파일 선택",

  paymentMethod: "결제 방법 *",
  paymentMethodPlaceholder: "선호하는 결제 방법 선택",
  cash: "현금",
  card: "신용/직불카드",
  onlineTransfer: "온라인 이체",
  paymentNote: "도착시 프런트 데스크에서 결제를 수납합니다",

  completeCheckInBtn: "체크인 완료",
  completingCheckIn: "체크인 완료 중...",
  editInfo: "내 정보 편집",

  goodDay: "안녕하세요, 소중한 고객님!",
  welcomeHostel: "펠랑이 캡슐 호스텔에 오신 것을 환영합니다",
  address: "주소:",
  hostelPhotos: "📸 호스텔 사진",
  googleMaps: "📍 구글 지도",
  checkInVideo: "🎥 체크인 비디오",
  checkInTime: "체크인: 오후 3:00부터",
  checkOutTime: "체크아웃: 오후 12:00까지",
  doorPassword: "문 비밀번호:",
  capsuleNumber: "귀하의 캡슐 번호:",
  accessCard: "캡슐 출입 카드: 베개 위에 놓여있습니다",
  importantReminders: "중요 알림사항:",
  noCardWarning: "🚫 카드를 캡슐 안에 두고 문을 닫지 마세요",
  noSmoking: "🚭 호스텔 내 금연",
  cctvWarning: "🎥 CCTV 감시 중 – 위반 행위(흡연 등)시 RM300 벌금이 부과될 수 있습니다",
  infoEditable: "정보 편집 가능",
  editUntil: "다음 시간까지 체크인 정보를 편집할 수 있습니다",
  editMyInfo: "내 정보 편집",
  assistance: "도움이 필요하시면 리셉션에 문의해 주세요.",
  enjoyStay: "펠랑이 캡슐 호스텔에서의 숙박을 즐기세요! 💼🌟",

  validatingLink: "체크인 링크 검증 중...",
  invalidLink: "잘못된 링크",
  invalidLinkDesc: "이 체크인 링크가 유효하지 않거나 토큰이 누락되었습니다.",
  expiredLink: "잘못되었거나 만료된 링크",
  expiredLinkDesc: "이 체크인 링크가 유효하지 않거나 만료되었습니다.",
  error: "오류",
  validationError: "체크인 링크 검증에 실패했습니다.",
  checkInFailed: "체크인 실패",
  checkInSuccess: "체크인 성공!",
  checkInSuccessDesc: "펠랑이 캡슐 호스텔에 오신 것을 환영합니다!",

  selectLanguage: "언어 선택",
  currentLanguage: "한국어"
,
  tipsTitle: "빠르게 작성하는 팁",
  tipHaveDocument: "신분증(아이씨) 또는 여권 중 하나만 준비하시면 됩니다.",
  tipPhoneFormat: "전화번호는 국가번호를 포함하세요. 예: 말레이시아 +60",
  tipGenderPrivacy: "개인정보를 원하시면 “기타” 또는 “응답하지 않음”을 선택할 수 있습니다.",
  tipLanguageSwitch: "상단 지구본 아이콘으로 언제든 언어 변경이 가능합니다.",

  photoTipsTitle: "사진 업로드 팁",
  photoTipLighting: "밝은 곳에서 문서 전체가 선명하게 보이도록 촬영하세요.",
  photoTipGlare: "빛반사/흐림을 피하고 휴대를 안정적으로 잡으세요.",
  photoTipSize: "최대 15MB까지 허용. 선명한 사진 1장으로 충분합니다.",

  nameHint: "신분증/여권과 동일한 표기로 입력하세요.",
  phoneHint: "국가번호 포함 (예: +60, +65).",
  genderHint: "편한 항목을 선택하세요. 적절한 캡슐 구역 추천에 사용됩니다.",
  nationalityHint: "입력하면 목록에서 국적을 검색할 수 있습니다.",
  icHint: "말레이시아: 하이픈 없는 12자리. 예: 881014015523",
  passportHint: "외국인: 여권에 인쇄된 번호를 그대로 입력하세요.",
  photoHint: "이름과 번호가 읽히는지 확인하세요. 흐리면 다시 촬영하세요.",
  emergencyContactHint: "선택 사항이지만 유용합니다. 비상시 연락 가능한 현지 번호가 도움이 됩니다.",
  emergencyPhoneHint: "국가번호 포함(예: +60). 다른 사람이 없으면 본인 번호도 가능합니다.",
  notesHint: "예: “23:30 도착”, “땅콩 알레르기”, “가능하면 하단 캡슐 희망”",
  paymentMethodHint: "예정된 결제 방법을 선택하세요. 도착 후 확정해도 됩니다.",
  cashDescriptionHint: "이미 현금 결제한 경우 직원명을 적어주세요. 아니면 비워두셔도 됩니다.",

  faqNeedHelp: "작성 도움이 필요하신가요?",
  faqIntro: "자주 묻는 질문과 답변:",
  faqIcVsPassportQ: "IC와 여권 둘 다 필요하나요?",
  faqIcVsPassportA: "아니요. 둘 중 하나만 필요합니다. IC를 입력하면 여권란은 비활성화되고, 그 반대도 같습니다.",
  faqPhotoUploadQ: "사진 업로드가 안 될 때는?",
  faqPhotoUploadA: "파일이 15MB 이하인지 확인하세요. HEIC/HEIF(iPhone), JPG, PNG, WEBP 지원. 인터넷 상태를 확인하고 안되면 재촬영하거나 JPEG로 변경해보세요.",
  faqPhoneFormatQ: "전화번호는 어떻게 쓰나요?",
  faqPhoneFormatA: "국가번호를 포함하세요. 예: +60(말레이시아) 또는 +65(싱가포르). 하이픈/공백 허용.",
  faqGenderWhyQ: "왜 성별을 묻나요?",
  faqGenderWhyA: "적절한 캡슐 구역 추천을 위한 용도입니다. “기타”나 “응답하지 않음”을 선택할 수 있습니다.",
  faqPrivacyQ: "내 정보는 안전한가요?",
  faqPrivacyA: "네. 투숙 및 법적 준수를 위해서만 사용하며, 문서는 공개하지 않습니다.",
  faqEditAfterQ: "제출 후 수정 가능하나요?",
  faqEditAfterA: "성공적으로 체크인한 후 1시간 이내에 성공 페이지의 링크로 수정할 수 있습니다."
  ,
  commonNotesTitle: "자주 쓰는 메모 빠르게 추가:",
  commonNoteLateArrival: "늦게 도착합니다(오후 11시 이후)",
  commonNoteArriveEarly: "일찍 도착합니다(오후 3시 이전)",
  commonNoteBottomCapsule: "가능하면 하단 캡슐 선호",
  commonNoteQuietArea: "가능하면 조용한 구역 선호",
  commonNoteExtraBedding: "담요 추가 요청",
};

// Translation dictionary
const translations: Record<Language, Translations> = {
  en: enTranslations,
  ms: msTranslations,
  'zh-cn': zhTranslations,
  es: esTranslations,
  ja: jaTranslations,
  ko: koTranslations
};

// I18n context
interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

export const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: enTranslations
});

// I18n hook
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// I18n Provider component props
interface I18nProviderProps {
  children: ReactNode;
}

// I18n Provider component factory function  
export const createI18nProvider = () => {
  return React.memo(({ children }: I18nProviderProps) => {
    const [language, setLanguageState] = useState<Language>(() => {
      // Get language from localStorage or default to English
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('hostel-language');
        if (stored && Object.keys(SUPPORTED_LANGUAGES).includes(stored)) {
          return stored as Language;
        }
        // Auto-detect from browser/system language (e.g., 'ms-MY' -> 'ms', 'zh-CN' -> 'zh-cn')
        const navLangRaw = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
        const normalized = navLangRaw.toLowerCase();
        // Map to our supported set
        const candidates: string[] = [normalized];
        const base = normalized.split('-')[0];
        if (base && base !== normalized) candidates.push(base);
        for (const cand of candidates) {
          if ((SUPPORTED_LANGUAGES as any)[cand]) {
            return cand as Language;
          }
          // Special-case mappings
          if (cand === 'zh' || cand === 'zh-hans' || cand === 'zh-my' || cand === 'zh-sg') {
            return 'zh-cn';
          }
        }
      }
      return 'en';
    });

    const setLanguage = (lang: Language) => {
      setLanguageState(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('hostel-language', lang);
      }
    };

    const t = translations[language];

    return React.createElement(
      I18nContext.Provider, 
      { value: { language, setLanguage, t } }, 
      children
    );
  });
};

// Export translation function for direct usage
export const getTranslations = (lang: Language): Translations => {
  return translations[lang] || translations.en;
};
// backend/src/controllers/uploadController.js
const uploadMedia = async (req, res) => {
  try {
    console.log("[UPLOAD] Файл успешно долетел до бэкенда:", req.file);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Файл не найден после загрузки в облако' });
    }

    // Безопасное определение типа (защита от краша сервера)
    let fileType = 'image';
    if (req.file.mimetype && req.file.mimetype.includes('video')) {
        fileType = 'video';
    }

    res.json({
      success: true,
      data: {
        type: fileType,
        url: req.file.path 
      }
    });
  } catch (error) {
    console.error("[UPLOAD FATAL ERROR]:", error);
    res.status(500).json({ success: false, error: 'Ошибка при формировании ответа: ' + error.message });
  }
};

module.exports = { uploadMedia };
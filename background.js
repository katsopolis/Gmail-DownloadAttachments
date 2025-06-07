/* global chrome */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'inboxsdk__injectPageWorld' && sender.tab) {
    if (chrome.scripting) {
      // MV3
      let documentIds;
      let frameIds;
      if (sender.documentId) {
        // Protect against https://github.com/w3c/webextensions/issues/8 in
        // browsers (Chrome 106+) that support the documentId property.
        // Protections for other browsers happen inside the injected script.
        documentIds = [sender.documentId];
      } else {
        frameIds = [sender.frameId];
      }
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id, documentIds, frameIds },
        world: 'MAIN',
        files: ['pageWorld.js'],
      });
      sendResponse(true);
    } else {
      // MV2 fallback. Tell content script it needs to figure things out.
      sendResponse(false);
    }
  }

  if (message.type === 'downloadAttachment') {
    const { url, filename } = message.payload;
    console.log('İndirme isteği alındı:', url, filename);

    if (!url || !filename) {
        console.error('Geçersiz indirme isteği: URL veya dosya adı eksik.');
        sendResponse({ status: 'error', message: 'URL veya dosya adı eksik' });
        return true; // Asenkron yanıt için
    }

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: false,
      conflictAction: 'uniquify'
    }, (downloadId) => {
      if (chrome.runtime.lastError || typeof downloadId === 'undefined') {
        const errMsg = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'unknown error';
        console.error(`'${filename}' indirme hatası:`, errMsg);
        sendResponse({ status: 'error', message: errMsg });
      } else {
        console.log(`'${filename}' indirme işlemi başladı, ID:`, downloadId);
        sendResponse({ status: 'success', downloadId: downloadId });
      }
    });

    // İndirme işlemi asenkron, yanıt callback içinde gönderiliyor.
    // sendResponse çağrıldığı için true döndürüyoruz.
    return true;
  }
});

// İsteğe bağlı: Uzantı kurulumunda veya başlangıcında yapılacak işlemler
chrome.runtime.onInstalled.addListener(() => {
  console.log('Better Download All Attachments uzantısı kuruldu/güncellendi.');
});

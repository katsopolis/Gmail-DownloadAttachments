// InboxSDK'yi yükle
Promise.all([
  InboxSDK.load('2.0', 'sdk_mlazzje-dlgmail_43a7d41655')
])
.then(function(results){
  var sdk = results[0];

  if (!sdk) {
    throw new Error('InboxSDK başlatılamadı');
  }

  var registerHandler = function() {
    try {
      sdk.Conversations.registerMessageViewHandler(messageViewHandler);
    } catch (error) {
      console.error('MessageViewHandler kaydı başarısız:', error);
    }
  };

  var messageViewHandler = function(messageView) {
    try {
      if(messageView && messageView.isLoaded()) {
        addCustomAttachmentsToolbarButton(messageView);
      }
    } catch (error) {
      console.error('MessageView işleme hatası:', error);
    }
  };

  var addCustomAttachmentsToolbarButton = function(messageView) {
    try {
      var options = {
        tooltip: chrome.i18n.getMessage('tooltip'),
        iconUrl: chrome.runtime.getURL('img/save.png'),
        onClick: handleAttachmentsButtonClick
      };

      messageView.addAttachmentsToolbarButton(options);
    } catch (error) {
      console.error('Buton ekleme hatası:', error);
    }
  };

  var handleAttachmentsButtonClick = function(event) {
    try {
      if (!event || !event.attachmentCardViews) {
        throw new Error('Geçersiz event veya attachmentCardViews yok');
      }

      var totalAttachments = event.attachmentCardViews.length;
      var successfulDownloads = 0;
      var failedDownloads = 0;

      event.attachmentCardViews.forEach(async function(attachmentCardView, index) {
        if (typeof attachmentCardView !== 'undefined') {
          let downloadUrl = null;
          let downloadMethod = 'unknown';
          let originalFilename = null;

          // Önce dosya adını almayı dene
          try {
            originalFilename = await attachmentCardView.getTitle();
            console.log(`[Info] Attachment Title (index ${index}):`, originalFilename);
          } catch (e) {
            console.warn(`[Info] attachmentCardView.getTitle() hatası veya metot yok (index ${index}):`, e);
            originalFilename = `attachment_${index}_${Date.now()}.download`; // Hata durumunda varsayılan ad
          }

          // 1. getDownloadURL dene (TXT gibi dosyalar için çalışabilir)
          try {
            const url = await attachmentCardView.getDownloadURL(); 
            if (url && typeof url === 'string') {
              downloadUrl = url;
              downloadMethod = 'getDownloadURL';
              console.log(`[InboxSDK] Alınan URL (index ${index}):`, downloadUrl);
            } else {
              console.log(`[InboxSDK] getDownloadURL null/geçersiz döndü (index ${index}).`);
            }
          } catch (e) {
            console.warn(`[InboxSDK] getDownloadURL hatası (index ${index}):`, e);
          }

          // 2. Eğer getDownloadURL işe yaramadıysa, DOM'u dene (Resimler için?)
          if (!downloadUrl) {
            console.log(`[DOM] getDownloadURL başarısız, DOM deneniyor (index ${index}).`);
            try {
              const element = attachmentCardView.getElement();
              if (element) {
                // Öncelik sırası: a[download] -> a[href*=".../attachment"] -> img[src]
                const downloadLink = element.querySelector('a[download][href*="googleusercontent.com"]'); // Tam indirme linki?
                const imageLink = element.querySelector('a:not([download])[href*="googleusercontent.com/attachment"]'); // Önizleme/dolaylı link?
                const imageSrc = element.querySelector('img[src*="googleusercontent.com"]'); // Gömülü/thumbnail resim?

                if (downloadLink && downloadLink.href) {
                  downloadUrl = downloadLink.href;
                  downloadMethod = 'DOM (a[download])';
                  console.log(`[DOM] URL bulundu (a[download]) (index ${index}):`, downloadUrl);
                } else if (imageLink && imageLink.href) {
                  downloadUrl = imageLink.href;
                  downloadMethod = 'DOM (a[href])';
                  console.log(`[DOM] URL bulundu (a[href]) (index ${index}):`, downloadUrl);
                } else if (imageSrc && imageSrc.src) {
                  // Son çare: thumbnail URL, temizlemeyi dene
                  const cleanedUrl = removeUrlImageParameters(imageSrc.src);
                  downloadUrl = cleanedUrl;
                  downloadMethod = 'DOM (img[src] cleaned)';
                  console.log(`[DOM] URL bulundu (img[src] - Temizlendi) (index ${index}):`, downloadUrl);
                } else {
                  console.warn(`[DOM] Element bulundu ama uygun link/src bulunamadı (index ${index}). Element:`, element);
                }
              } else {
                console.warn(`[DOM] attachmentCardView.getElement() başarısız (index ${index}).`);
              }
            } catch (e) {
              console.error(`[DOM] Element alma/işleme hatası (index ${index}):`, e);
            }
          }

          // 3. İndirme işlemini yap (eğer bir URL bulunduysa ve dosya adı varsa)
          if (downloadUrl && typeof downloadUrl === 'string' && originalFilename) {
            console.log(`[Download] İndirme deneniyor (index ${index}, method: ${downloadMethod}, filename: ${originalFilename}, url: ${downloadUrl})`);
            downloadAttachment(downloadUrl, originalFilename,
              function() { // Başarı callback'i
                successfulDownloads++;
                console.log(`İndirme isteği gönderildi (index ${index}, method: ${downloadMethod})`);
                 if (successfulDownloads + failedDownloads === totalAttachments) {
                   console.log('Tüm indirme istekleri gönderildi. Başarılı:', successfulDownloads, 'Başarısız:', failedDownloads);
                 }
              },
              function(error) { // downloadAttachment hata callback'i
                failedDownloads++;
                console.error(`downloadAttachment hazırlama/gönderme hatası (index ${index}, method: ${downloadMethod}):`, error);
                 if (successfulDownloads + failedDownloads === totalAttachments) {
                   console.log('Tüm indirme istekleri gönderildi (hatalarla). Başarılı:', successfulDownloads, 'Başarısız:', failedDownloads);
                 }
              }
            );
          } else { // URL veya dosya adı bulunamadı
            failedDownloads++;
            console.error(`İndirilecek URL veya dosya adı bulunamadı (index ${index}). URL: ${downloadUrl}, Filename: ${originalFilename}`);
             if (successfulDownloads + failedDownloads === totalAttachments) {
               console.log('Tüm indirme istekleri gönderildi (URL/Filename bulunamayanlarla). Başarılı:', successfulDownloads, 'Başarısız:', failedDownloads);
             }
          }

        } else {
           console.warn('Undefined attachmentCardView (index ' + index + ')');
           failedDownloads++;
           if (successfulDownloads + failedDownloads === totalAttachments) {
                console.log('Tüm indirme istekleri gönderildi (tanımsız eklerle). Başarılı:', successfulDownloads, 'Başarısız:', failedDownloads);
           }
        }
      }); // End forEach
    } catch (error) {
      console.error('İndirme işlemi hatası:', error);
    }
  };

  // Başlat
  registerHandler();
})
.catch(function(error) {
  console.error('InboxSDK initialization failed:', error);
  // Hata durumunda kullanıcıya bilgi ver
  chrome.runtime.sendMessage({
    type: 'error',
    message: 'Eklenti başlatılamadı: ' + error.message
  });
});

/**
 * Run multiple files download
 * @param  {Array} urls  Array of urls (pointing to files)
 * @param  {Integer} duration time between each HTTP call
 */
function processMultipleFilesDownload(urls, duration) { // Not used anymore
  urls.forEach(function(url, index) {
    setTimeout(function() {
      downloadAttachment(url);
    }, index * duration);
  });
}


/**
 * Run attachment download
 * @param  {string} url    Url to download the attachment
 * @param  {string} filename The desired filename for the download
 * @param  {function} onSuccess Success callback
 * @param  {function} onError Error callback
 */
function downloadAttachment(url, filename, onSuccess, onError) {
  try {
    if (!url) {
      throw new Error('URL parametresi gerekli');
    }
    if (!filename) {
      console.warn('downloadAttachment fonksiyonuna dosya adı gönderilmedi, varsayılan kullanılıyor.');
      filename = `attachment_${Date.now()}.download`; // Fallback filename
    }

    var stripped = stripUrl(url);

    if (!stripped) {
      console.warn('URL doğrulanamadı/temizlenemedi, orijinal URL ile deneniyor:', url);
      stripped = url;
    }

    // İndirme isteğini arka plan betiğine gönder
    chrome.runtime.sendMessage({
        type: 'downloadAttachment',
        payload: {
            url: stripped,
            filename: filename
        }
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('Mesaj gönderme hatası:', chrome.runtime.lastError);
            if (onError) onError(new Error(chrome.runtime.lastError.message || 'Mesaj gönderilemedi'));
        } else if (response && response.status === 'error') {
            console.error('Arka plan indirme hatası:', response.message);
            if (onError) onError(new Error(response.message));
        } else {
            // Arka plan başarıyla aldı, ancak asıl indirme ayrı takip edilir.
            // İsteğe bağlı: Başarı durumunu logla veya onSuccess çağır.
            if (onSuccess) onSuccess(); 
        }
    });

  } catch (error) {
    console.error('İndirme işlemi hazırlama hatası:', error);
    if (onError) onError(error);
  }
}

/**
 * Parse a string containing a url
 * @param  {string} url Surrounded url
 * @return {string|null} The url extracted from the given string or null if invalid
 */
function stripUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Daha kapsayıcı URL doğrulama regex'i (:, @, + gibi karakterlere izin verir)
  var re = /^(https?:\/\/)([\w.-]+(:[\w.-]+)*@)?([\w-]+(\.[\w-]+)+)(:[0-9]+)?(\/[\w\-.~:/?#\[\]@!$&'()*+,;=]*)?$/;
  var match = url.match(re);
  
  return match ? match[0] : null;
}

/**
 * Extracts filename from a URL.
 * @param {string} url The URL.
 * @return {string|null} Filename or null if not found.
 */
function getFilenameFromUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  try {
    // Decode URL first (e.g., %20 -> space)
    const decodedUrl = decodeURIComponent(url);
    // Match the last part after '/' or '\'
    const match = decodedUrl.match(/[^\\/]+$/);
    if (match && match[0]) {
        // Remove potential query string and fragment
        const filename = match[0].split('?')[0].split('#')[0];
        // Basic sanitization (replace potentially invalid chars)
        return filename.replace(/[<>:"/\\|?*]/g, '_');
    }
  } catch (e) {
      console.error("Error extracting filename from URL:", url, e);
  }
  console.warn("Could not extract filename from URL, using default:", url);
  return `attachment_${Date.now()}.ext`; // Provide a default name with a generic extension
}

/**
 * Removes common image sizing parameters (like =w, =h, =s, -n, -p) from Google content URLs.
 * @param {string} url The image URL.
 * @return {string} The URL with sizing parameters removed, or the original URL if cleanup fails.
 */
function removeUrlImageParameters(url) {
  if (!url || typeof url !== 'string') {
    return url; // Return original if invalid
  }
  try {
    const lastEqualSignIndex = url.lastIndexOf('=');
    
    // If an '=' is found and it's not the first character (prevent removing essential parts)
    if (lastEqualSignIndex > 0) {
      const cleanedUrl = url.substring(0, lastEqualSignIndex);
      console.log("[Cleaner] Force removing segment after last '=':", url, "->", cleanedUrl);
      return cleanedUrl;
    } else {
        // If no '=' is found, return the original URL
        console.warn("[Cleaner] No '=' found in URL, returning original:", url);
        return url;
    }

  } catch (e) {
    console.error("Error cleaning image URL parameters:", url, e);
    return url; // Return original on error
  }
}

function dispatchEvent(element, event, type) {
  if (element.dispatchEvent) {
    element.dispatchEvent(event);
  } else if (element.fireEvent) {
    element.fireEvent('on' + event.eventType, event);
  }
}

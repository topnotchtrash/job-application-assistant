chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === "extractJD") {
      const allBlocks = [];
      const elements = document.querySelectorAll("section, div, article, main");
  
      elements.forEach((el) => {
        const text = el.innerText?.trim();
        if (text && text.length > 150 && text.length < 10000) {
          allBlocks.push(text);
        }
      });
  
      // If nothing is found, fallback to full body text
      if (allBlocks.length === 0) {
        allBlocks.push(document.body.innerText);
      }
  
      sendResponse({ jdBlocks: allBlocks });
    }
  });
  
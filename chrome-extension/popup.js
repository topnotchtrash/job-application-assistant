document.getElementById("checkFit").addEventListener("click", async () => {
    const resumeText = document.getElementById("resumeText").value.trim();
    const jd = document.getElementById("jd").value.trim();
    const resultBox = document.getElementById("result");
  
    const file = document.getElementById("resumeFile").files[0];
    let resume = resumeText;
  
    if (file) {
      const fileText = await readFileAsync(file);
      resume = fileText;
    }
  
    if (!resume || !jd) {
      resultBox.textContent = "Please provide both resume and job description.";
      return;
    }
  
    resultBox.textContent = "Evaluating fit...";
  
    try {
      const res = await fetch("http://localhost:8000/evaluate-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, job_description: jd })
      });
  
      const data = await res.json();
      resultBox.textContent = JSON.stringify(data.result, null, 2);
    } catch (err) {
      console.error(err);
      resultBox.textContent = "Something went wrong. Check backend.";
    }
  });
  
  document.getElementById("extractJD").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "extractJD" }, (response) => {
        document.getElementById("jd").value = response?.jobDescription || "Could not extract JD.";
      });
    });
  });
  document.getElementById("extractJD").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "extractJD" },
        async (response) => {
          const blocks = response?.jdBlocks || [];
  
          if (blocks.length === 0) {
            document.getElementById("jd").value = "No job description found.";
            return;
          }
  
          // Send to backend to clean
          try {
            const res = await fetch("http://localhost:8000/clean-jd", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ blocks })
            });
  
            const data = await res.json();
            document.getElementById("jd").value = data.cleaned_jd || "Could not extract JD.";
          } catch (err) {
            console.error("JD cleaning failed:", err);
            document.getElementById("jd").value = "Error during JD cleanup.";
          }
        }
      );
    });
  });  
  
  function readFileAsync(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });

  }
  
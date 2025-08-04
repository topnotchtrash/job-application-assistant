pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
document.getElementById("checkFit").addEventListener("click", async () => {
  const resumeText = document.getElementById("resumeText").value.trim();
  const jdText = document.getElementById("jd").value.trim();
  const cleanedJDText = document.getElementById("cleanedJD").value.trim();
  const resultBox = document.getElementById("result");

  const file = document.getElementById("resumeFile").files[0];
  let resume = resumeText;

  if (file) {
    try {
      let fileContent = "";
      
      if (file.type === "application/pdf") {
        fileContent = await extractPdfText(file);
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        resultBox.textContent = "DOCX files are not supported in this version. Please convert to text or use the text area.";
        return;
      } else {
        // Handle text files as before
        const fileText = await readFileAsync(file);
        fileContent = fileText.trim();
      }
      
      console.log("File content length:", fileContent.length);
      
      // Use only file content and clear the textarea
      resume = fileContent;
      document.getElementById("resumeText").value = "";
      console.log("Using file content only, cleared textarea");
    } catch (error) {
      console.error("Error reading file:", error);
      resultBox.textContent = "Error reading resume file. Please try again.";
      return;
    }
  }

  // Use cleaned JD if available, otherwise use the main JD textarea
  const jd = cleanedJDText || jdText;

  console.log("Final resume content length:", resume.length);
  console.log("JD content length:", jd.length);
  console.log("Resume content:", resume.substring(0, 100) + "...");
  console.log("JD content:", jd.substring(0, 100) + "...");

  if (!resume || !jd) {
    if (!resume && !jd) {
      resultBox.textContent = "Please provide both resume and job description.";
    } else if (!resume) {
      resultBox.textContent = "Please provide your resume (upload file or paste text).";
    } else {
      resultBox.textContent = "Please provide the job description.";
    }
    return;
  }

  resultBox.textContent = "Evaluating fit...";
  document.getElementById("resultSection").style.display = "block";

  try {
    const res = await fetch("http://localhost:8000/evaluate-fit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_text: resume, job_description: jd })
    });

    const data = await res.json();
    console.log("Backend response:", data);
    
    // Extract the fit_result text and display it nicely
    if (data.fit_result) {
      resultBox.value = data.fit_result;
    } else {
      // Fallback to raw JSON if fit_result is not found
      resultBox.value = JSON.stringify(data, null, 2);
    }
  } catch (err) {
    console.error(err);
    resultBox.value = "Error: Something went wrong. Please check your backend server.";
  }
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
          document.getElementById("cleanedJD").value = data.cleaned_jd || "Could not extract JD.";
        } catch (err) {
          console.error("JD cleaning failed:", err);
          document.getElementById("cleanedJD").value = "Error during JD cleanup.";
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

async function extractPdfText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // Check if PDF.js is available
        if (typeof pdfjsLib === 'undefined') {
          reject(new Error('PDF.js library not loaded'));
          return;
        }
        
        const arrayBuffer = reader.result;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n';
        }
        
        resolve(fullText.trim());
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function formatEvaluationResult(result) {
  try {
    // Handle undefined, null, or empty results
    if (result === undefined || result === null) {
      return "❌ No result received from the backend. Please check your backend server.";
    }
    
    // If result is already a string, return it as-is
    if (typeof result === 'string') {
      if (result.trim() === '') {
        return "❌ Empty result received from the backend.";
      }
      return result;
    }
    
    // If result is an object, try to format it nicely
    if (typeof result === 'object' && result !== null) {
      let formatted = '';
      
      // Handle different possible response structures
      if (result.score !== undefined) {
        formatted += `📊 FIT SCORE: ${result.score}\n\n`;
      }
      
      if (result.analysis) {
        formatted += `📋 ANALYSIS:\n${result.analysis}\n\n`;
      }
      
      if (result.recommendations) {
        formatted += `💡 RECOMMENDATIONS:\n${result.recommendations}\n\n`;
      }
      
      if (result.strengths) {
        formatted += `✅ STRENGTHS:\n${result.strengths}\n\n`;
      }
      
      if (result.weaknesses) {
        formatted += `⚠️ AREAS FOR IMPROVEMENT:\n${result.weaknesses}\n\n`;
      }
      
      if (result.matching_skills) {
        formatted += `🎯 MATCHING SKILLS:\n${result.matching_skills}\n\n`;
      }
      
      if (result.missing_skills) {
        formatted += `❌ MISSING SKILLS:\n${result.missing_skills}\n\n`;
      }
      
      // If none of the above fields exist, format as JSON
      if (formatted === '') {
        return `📄 RAW RESPONSE:\n${JSON.stringify(result, null, 2)}`;
      }
      
      return formatted.trim();
    }
    
    // Fallback to JSON stringify
    return `📄 RAW RESPONSE:\n${JSON.stringify(result, null, 2)}`;
  } catch (error) {
    console.error('Error formatting result:', error);
    return `❌ Error formatting result: ${error.message}\n\n📄 RAW DATA:\n${JSON.stringify(result, null, 2)}`;
  }
}

// Copy result to clipboard
document.getElementById("copyResult").addEventListener("click", async () => {
  const resultText = document.getElementById("result").value;
  try {
    await navigator.clipboard.writeText(resultText);
    const copyBtn = document.getElementById("copyResult");
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    copyBtn.style.backgroundColor = "#28a745";
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.style.backgroundColor = "#28a745";
    }, 2000);
  } catch (err) {
    console.error('Failed to copy: ', err);
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = resultText;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    const copyBtn = document.getElementById("copyResult");
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = "Copy Results";
    }, 2000);
  }
});

// Clear result
document.getElementById("clearResult").addEventListener("click", () => {
  document.getElementById("result").value = "";
  document.getElementById("resultSection").style.display = "none";
});

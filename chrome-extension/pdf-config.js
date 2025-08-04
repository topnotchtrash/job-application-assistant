// PDF.js configuration
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
} 
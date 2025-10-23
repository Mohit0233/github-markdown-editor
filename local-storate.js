// Local Storage Helpers for GitHub Markdown Editor
// Provides getSavedContent and saveContent abstractions.
(function(){
  const STORAGE_KEY = 'markdownContent';

  function getSavedContent(){
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch(e){
      console.warn('[local-storate] Failed to read localStorage:', e);
      return '';
    }
  }

  function saveContent(content){
    try {
      localStorage.setItem(STORAGE_KEY, content);
    } catch(e){
      console.warn('[local-storate] Failed to write localStorage:', e);
    }
  }

  // Expose globally
  window.getSavedContent = getSavedContent;
  window.saveContent = saveContent;
})();

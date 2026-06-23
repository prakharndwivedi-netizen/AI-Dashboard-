/**
 * Backend for Student Dashboard
 */

function doGet() {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Student Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Fetches data from the 'dataset' sheet.
 * Maps any column name to the specific keys the frontend expects.
 */
function getSpreadsheetData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('dataset') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 2) return [];
    
    // Normalize headers: lowercase and remove spaces
    const headers = data[0].map(h => String(h).toLowerCase().replace(/\s+/g, ''));
    const rows = data.slice(1);
    
    return rows.map((row, index) => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });

      // Logic to find the right data regardless of exact column title
      const firstName = obj.firstname || obj.name || obj.studentname || "Student";
      const lastName = obj.lastname || "";
      const college = obj.college || obj.itiname || obj.institution || "Unknown ITI";
      const trade = obj.trade || obj.tradename || "N/A";
      const division = obj.division || obj.zone || "Unassigned";
      
      // Completion Logic: check for 'percent' column or 'status' column
      let progress = 0;
      const progressKey = headers.find(h => h.includes('percent') || h.includes('progress'));
      if (progressKey) progress = parseFloat(obj[progressKey]) || 0;
      
      const status = (obj.status && obj.status.toLowerCase().includes('comp')) || progress >= 100 
                     ? 'Completed' : 'In Progress';

      return {
        id: index + 1,
        firstName: firstName,
        lastName: lastName,
        college: college,
        trade: trade,
        division: division,
        status: status,
        completedPercent: progress >= 100 ? 100 : progress
      };
    });
  } catch (e) {
    console.error("Critical Error: " + e.toString());
    return [];
  }
}

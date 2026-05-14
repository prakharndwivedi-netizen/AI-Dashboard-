/**
 * Google Apps Script - Student Dashboard Backend
 */

function doGet() {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Student Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Fetches data from the spreadsheet.
 * Expected sheet name: "dataset" (or first sheet)
 */
function getSpreadsheetData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('dataset') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 2) return [];
    
    const headers = data[0];
    const rows = data.slice(1);
    
    return rows.map(row => {
      let obj = {};
      headers.forEach((header, i) => {
        // Map common header names to expected property names
        const key = String(header).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        let value = row[i];
        
        // Handle dates
        if (value instanceof Date) {
          value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        }
        
        obj[key] = value;
      });
      
      // Extract specific metrics with priority logic
      const rawCollege = obj.college || obj.itiname || obj.itipname || obj.institution || '';
      const collegeName = rawCollege.replace(/^Government Industrial Training Institute\s+/i, 'GITI ').trim();
      
      const divisionName = obj.division || obj.zone || obj.region || 'Unassigned';
      
      // Determine Completion Percentage correctly
      // We want the column that represents the PERCENT, not the date
      let completedValue = 0;
      if (obj.completed !== undefined && !isNaN(parseFloat(obj.completed))) {
        completedValue = parseFloat(obj.completed);
      } else {
        const compKey = Object.keys(obj).find(k => (k.includes('percent') || k === 'completed') && !k.includes('at'));
        if (compKey) completedValue = parseFloat(obj[compKey]) || 0;
      }

      // Check for 'Status' as a secondary indicator
      if (completedValue < 100) {
        const statusStr = String(obj.status || '').toLowerCase();
        if (statusStr === 'completed' || statusStr === 'complete') completedValue = 100;
      }

      return {
        firstName: obj.firstname || obj.studentname?.split(' ')[0] || row[0] || '',
        lastName: obj.lastname || obj.studentname?.split(' ').slice(1).join(' ') || row[1] || '',
        email: obj.email || obj.emailid || '',
        phone: obj.phone || obj.mobilenumber || '',
        college: collegeName || 'Unknown ITI',
        division: divisionName,
        district: obj.district || obj.homedistrict || '',
        trade: obj.trade || obj.tradename || '',
        status: completedValue >= 100 ? 'Completed' : 'In Progress',
        gender: obj.gender || obj.sex || 'Not Specified',
        category: obj.category || obj.socialcategory || 'General',
        incomeLevel: obj.incomelevel || obj.familyincome || 'Not Specified',
        year: obj.year || '',
        startedAt: obj.startedat || '',
        completedAt: obj.completedat || '',
        completedPercent: completedValue
      };
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
}

/**
 * Helper to include files in the template
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

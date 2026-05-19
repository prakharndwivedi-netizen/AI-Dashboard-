/**
 * Google Apps Script - Student Dashboard Backend
 */

function doGet(e) {
  // Support both HTML and JSON responses
  if (e && e.parameter && e.parameter.format === 'json') {
    const data = getSpreadsheetData();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Student Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Fetches and processes data from the spreadsheet with level-1 caching.
 */
function getSpreadsheetData() {
  const cache = CacheService.getScriptCache();
  const cachedData = cache.get("spreadsheet_data");
  
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      console.error("Cache parse error", e);
    }
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('dataset') || ss.getSheets()[0];
    const range = sheet.getDataRange();
    const data = range.getValues();
    
    if (data.length < 2) return [];
    
    const headers = data[0].map(h => String(h).toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
    const rows = data.slice(1);
    
    const processedData = rows.map((row, index) => {
      let obj = {};
      headers.forEach((key, i) => {
        let value = row[i];
        if (value instanceof Date) {
          value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        }
        obj[key] = value;
      });
      
      // Intelligent Mapping
      const rawCollege = obj.college || obj.itiname || obj.itipname || obj.institution || '';
      const collegeName = rawCollege.replace(/^Government Industrial Training Institute\s+/i, 'GITI ').trim();
      
      const divisionName = obj.division || obj.zone || obj.region || 'Unassigned';
      
      // Completion Logic
      let completedValue = 0;
      const compKey = Object.keys(obj).find(k => (k.includes('percent') || k === 'completed' || k === 'completion') && !k.includes('at'));
      if (compKey) {
        completedValue = parseFloat(obj[compKey]) || 0;
      }

      // Status Override
      const statusStr = String(obj.status || '').toLowerCase();
      if (statusStr === 'completed' || statusStr === 'complete' || completedValue >= 100) {
        completedValue = 100;
      }

      return {
        id: index + 1,
        firstName: obj.firstname || obj.studentname?.split(' ')[0] || String(row[0] || ''),
        lastName: obj.lastname || obj.studentname?.split(' ').slice(1).join(' ') || String(row[1] || ''),
        email: obj.email || obj.emailid || '',
        phone: obj.phone || obj.phonenumber || obj.mobile || obj.contact || '',
        college: collegeName || 'Unknown ITI',
        division: divisionName,
        district: obj.district || obj.homedistrict || '',
        trade: obj.trade || obj.tradename || '',
        status: completedValue >= 100 ? 'Completed' : 'In Progress',
        gender: obj.gender || obj.sex || 'Not Specified',
        category: obj.category || obj.socialcategory || 'General',
        incomeLevel: obj.incomelevel || obj.familyincome || 'Not Specified',
        startedAt: obj.startedat || '',
        completedAt: obj.completedat || '',
        completedPercent: completedValue
      };
    });

    // Cache the processed data for 10 minutes
    try {
      cache.put("spreadsheet_data", JSON.stringify(processedData), 600);
    } catch (e) {
      // If data is too large for cache (100KB limit), just skip caching
    }

    return processedData;
  } catch (error) {
    console.error('Data Fetching Critical Error:', error);
    return [];
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

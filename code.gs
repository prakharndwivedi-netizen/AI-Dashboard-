/**
 * Google Apps Script - Student Dashboard Backend
 * Optimized for performance and large datasets.
 */

function doGet(e) {
  // Support both HTML and JSON responses
  if (e && e.parameter && e.parameter.format === 'json') {
    const data = getSpreadsheetData();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Ensure 'index' matches your HTML file name
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Student Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Fetches and processes data from the spreadsheet.
 */
function getSpreadsheetData() {
  const cache = CacheService.getScriptCache();
  const CACHE_KEY = "spreadsheet_data_v2";
  
  const cachedData = cache.get(CACHE_KEY);
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      console.warn("Cache parse failed, fetching fresh data...");
    }
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Try 'dataset' sheet first, fallback to first sheet
    const sheet = ss.getSheetByName('dataset') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 2) return [];
    
    // 1. Pre-process headers once
    const rawHeaders = data[0];
    const headers = rawHeaders.map(h => 
      String(h).toLowerCase().trim().replace(/[^a-z0-9]/g, '')
    );
    
    const rows = data.slice(1);
    const timeZone = Session.getScriptTimeZone();
    
    // 2. Identify important column indices once (Performance Optimization)
    const colIdx = {
      status: headers.indexOf('status'),
      percent: headers.find(h => h.includes('percent') || h === 'progress'),
      studentName: headers.find(h => h.includes('studentname') || h.includes('fullname'))
    };

    const processedData = rows.map((row, index) => {
      let obj = {};
      headers.forEach((key, i) => {
        let value = row[i];
        // Safe Date Formatting
        if (value instanceof Date && !isNaN(value.getTime())) {
          value = Utilities.formatDate(value, timeZone, "yyyy-MM-dd HH:mm:ss");
        } else if (value === null || value === undefined) {
          value = '';
        }
        obj[key] = value;
      });
      
      // Intelligent Mapping
      const rawCollege = obj.college || obj.itiname || obj.itipname || obj.institution || '';
      const collegeName = String(rawCollege).replace(/^Government Industrial Training Institute\s+/i, 'GITI ').trim();
      const divisionName = obj.division || obj.zone || obj.region || 'Unassigned';
      
      // Progress/Completion Logic
      let completedValue = 0;
      const compKey = headers.find(h => (h.includes('percent') || h === 'completed' || h === 'completion') && !h.includes('at'));
      if (compKey) {
        completedValue = parseFloat(obj[compKey]) || 0;
      }

      const statusStr = String(obj.status || '').toLowerCase();
      const isFinished = (statusStr.includes('complete') || completedValue >= 100);
      if (isFinished) completedValue = 100;

      // Safe Name Extraction (No optional chaining crash)
      const sName = String(obj.studentname || obj.fullname || '');
      const nameParts = sName.split(' ');

      return {
        id: index + 1,
        firstName: obj.firstname || nameParts[0] || '',
        lastName: obj.lastname || nameParts.slice(1).join(' ') || '',
        email: obj.email || obj.emailid || '',
        phoneNumber: obj.phone || obj.phonenumber || obj.mobile || obj.contact || '',
        college: collegeName || 'Unknown ITI',
        division: divisionName,
        district: obj.district || obj.homedistrict || '',
        trade: obj.trade || obj.tradename || '',
        status: isFinished ? 'Completed' : 'In Progress',
        gender: obj.gender || obj.sex || 'Not Specified',
        category: obj.category || obj.socialcategory || 'General',
        incomeLevel: obj.incomelevel || obj.familyincome || 'Not Specified',
        startedAt: extractDate(obj, ['startedat', 'registrationdate', 'timestamp', 'createdat'], 'start'),
        completedAt: extractDate(obj, ['completedat', 'completiondate', 'finishdate'], 'completed'),
        completedPercent: completedValue
      };
    });

    // 3. Smart Caching (Handle 100KB limit)
    try {
      const stringified = JSON.stringify(processedData);
      if (stringified.length < 100000) { // Only cache if under ~100KB
        cache.put(CACHE_KEY, stringified, 600);
      }
    } catch (e) {
      console.warn("Data too large to cache");
    }

    return processedData;
  } catch (error) {
    console.error('Critical Backend Error:', error.toString());
    return [];
  }
}

/**
 * Helper to find date fields in the object
 */
function extractDate(obj, preferredKeys, keyword) {
  // Check preferred keys first
  for (let key of preferredKeys) {
    if (obj[key]) return obj[key];
  }
  // Fallback to searching all keys for the keyword
  const keys = Object.keys(obj);
  const found = keys.find(k => k.includes(keyword) && k.includes('date'));
  return found ? obj[found] : '';
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

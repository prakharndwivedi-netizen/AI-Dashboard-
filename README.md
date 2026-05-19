# Student Performance & Progress Dashboard

An intelligent, real-time analytics platform for tracking student progress across institutions.

## 🚀 Features

- **Live Data Sync**: Directly connected to Google Sheets (via CSV publishing) for real-time updates.
- **Dynamic Analytics**: Automated aggregation of metrics across divisions and colleges.
- **Performance Intelligence**: Efficiency tracking, funnel analysis, and demographic breakdowns.
- **Responsive Design**: Fully optimized for desktop and mobile devices.
- **Export Ready**: One-click CSV export for offline reporting.

## 💻 Local Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd <repo-name>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## 🛠️ Technical Stack

- **Frontend**: React 18, Tailwind CSS
- **Graphics**: ApexCharts for data visualization
- **Icons**: Lucide React
- **Data Parsing**: PapaParse
- **Build System**: Vite

## 🔗 Google Apps Script Integration

The project includes a `Code.gs` file which is designed to run within the Google Apps Script environment. This script:
- Fetches data from Google Sheets.
- Handles custom filtering and aggregation logic.
- Serves as the data provider for the dashboard.

To sync the script locally, it is recommended to use **[clasp](https://github.com/google/clasp)**.

## 📊 Data Integration

To use your own data:
1. Open your Google Sheet.
2. Go to **File > Share > Publish to web**.
3. Select **Comma-separated values (.csv)**.
4. Copy the link and update the `GOOGLE_SHEET_CSV_URL` constant in `index.html`.

## 🎨 Palette

- **Brand Green**: `#31B89D` (Success & Primary)
- **Brand Orange**: `#FF9700` (Progress & Accents)
- **Neutral**: `#282828` (Typography & Contrast)

---
*Developed for Educational Progress Tracking.*

<!DOCTYPE html>
<html lang="en">
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student Dashboard</title>
  
  <!-- CDNs -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/apexcharts@3.35.3/dist/apexcharts.min.js" crossorigin></script>
  <script src="https://cdn.jsdelivr.net/npm/react-apexcharts@1.4.0/dist/react-apexcharts.iife.min.js" crossorigin></script>
  <script src="https://unpkg.com/lucide@0.263.0/dist/umd/lucide.min.js" crossorigin></script>
  <script src="https://unpkg.com/papaparse@5.4.1/papaparse.min.js"></script>
  
  <script>
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      console.log('Global Error caught: ' + msg + ' at ' + lineNo + ':' + columnNo);
      return false;
    };
  </script>
  
  <!-- Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <style>
    body { 
      font-family: 'Inter', sans-serif; 
      background-color: #F2F2F2; 
      color: #282828;
      margin: 0;
    }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    .geo-card { 
      background: white;
      border-radius: 0.75rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      padding: 1.5rem;
    }

    /* Custom Transitions */
    .tab-transition { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

    @keyframes progress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .animate-progress {
      animation: progress 1.5s infinite linear;
    }
  </style>

  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: '#31B89D',
            'brand-green': '#31B89D',
            'brand-green-light': '#4FD3A8',
            'brand-green-pale': '#B2FFE0',
            'brand-orange': '#FF9700',
            'brand-orange-light': '#FFB900',
            'brand-orange-pale': '#FCE7B3',
            'brand-dark': '#282828',
            'brand-bg': '#F2F2F2',
            accent: '#FF9700',
            primary: '#31B89D',
            warning: '#FFB900',
            dark: '#282828',
            light: '#F2F2F2'
          }
        }
      }
    }
  </script>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useMemo, useEffect } = React;
    
    /**
     * GITHUB HOSTING OPTIMIZATION:
     * To host this on GitHub and pull live data from Google Sheets:
     * 1. In your Google Sheet, go to File > Share > Publish to web.
     * 2. Select 'Entire Document' and 'Comma-separated values (.csv)'.
     * 3. Copy the link and paste it below in GOOGLE_SHEET_CSV_URL.
     */
    const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9DApK8KKyzzUcIJK_EbtPCyAYVOqYLndR5O9obqyZoVBJzt5Yr10LYhEkrUEIkUzucVNhBkF2srgh/pub?gid=493239070&single=true&output=csv"; 

    // --- MANUAL APEX CHARTS BRIDGE ---
    const Chart = (props) => {
      const chartRef = React.useRef(null);
      const chartInstance = React.useRef(null);
      const [libFound, setLibFound] = useState(!!window.ApexCharts);

      useEffect(() => {
        if (!libFound) {
          const interval = setInterval(() => {
            if (window.ApexCharts) {
              setLibFound(true);
              clearInterval(interval);
            }
          }, 500);
          return () => clearInterval(interval);
        }
      }, [libFound]);

      useEffect(() => {
        if (!libFound || !chartRef.current) return;

        // Small delay to ensure container is fully sized
        const timeout = setTimeout(() => {
          if (chartInstance.current) {
            chartInstance.current.destroy();
          }

          const config = {
            ...props.options,
            series: props.series,
            chart: {
              ...props.options.chart,
              type: props.type || 'line',
              height: props.height || 'auto',
              animations: { enabled: true }
            }
          };

          chartInstance.current = new window.ApexCharts(chartRef.current, config);
          chartInstance.current.render();
        }, 100);

        return () => {
          clearTimeout(timeout);
          if (chartInstance.current) {
            chartInstance.current.destroy();
            chartInstance.current = null;
          }
        };
      }, [libFound, props.options, props.series, props.type, props.height]);

      if (!libFound) {
        return (
          <div className="h-full w-full bg-slate-50 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg p-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Graphics...</span>
          </div>
        );
      }

      return <div ref={chartRef} className="w-full h-full" />;
    };

    // --- UTILITIES ---
    const getAggregatedMetrics = (records) => {
      const registrations = records.length;
      
      const isCompleted = (r) => {
        const val = parseFloat(r.completedPercent);
        return !isNaN(val) && val >= 100;
      };

      const completions = records.filter(isCompleted).length;
      
      const muzRecords = records.filter(r => String(r.division || '').toLowerCase().includes('muzaffarpur'));
      const muzTotal = muzRecords.length;
      const muzCompleted = muzRecords.filter(isCompleted).length;

      const patnaRecords = records.filter(r => String(r.division || '').toLowerCase().includes('patna'));
      const patnaTotal = patnaRecords.length;
      const patnaCompleted = patnaRecords.filter(isCompleted).length;

      // Last 30 Days Logic
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRegs = records.filter(r => {
        if (!r.startedAt) return false;
        const d = new Date(r.startedAt);
        return d >= thirtyDaysAgo;
      }).length;

      const recentComps = records.filter(r => {
        if (!r.completedAt) return false;
        const d = new Date(r.completedAt);
        return d >= thirtyDaysAgo && r.completedPercent >= 100;
      }).length;

      return {
        registrations,
        completions,
        muzProgress: `${muzCompleted} / ${muzTotal}`,
        patnaProgress: `${patnaCompleted} / ${patnaTotal}`,
        recentRegs,
        recentComps,
        stability: "100%",
        hasData: records.length > 0
      };
    };

    const getDistribution = (records, field) => {
      const counts = {};
      records.forEach(r => {
        let val = String(r[field] || '').trim();
        // Skip placeholders but allow meaningful data
        if (!val || ['n/a', 'unknown', 'undefined', 'unassigned', 'not specified'].includes(val.toLowerCase())) return;
        counts[val] = (counts[val] || 0) + 1;
      });
      
      const result = Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      
      return result.length > 0 ? result : [{ name: 'No Specific Data', value: 0 }];
    };

    const getCollegeMetrics = (records) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const colleges = {};
      records.forEach(r => {
        const name = r.college || 'N/A';
        if (!colleges[name]) colleges[name] = { registrations: 0, completions: 0, recentCompletions: 0 };
        
        colleges[name].registrations++;
        const pComp = parseFloat(r.completedPercent);
        if (!isNaN(pComp) && pComp >= 100) {
          colleges[name].completions++;
          
          if (r.completedAt) {
            const compDate = new Date(r.completedAt);
            if (compDate >= thirtyDaysAgo) {
              colleges[name].recentCompletions++;
            }
          }
        }
      });
      
      return Object.entries(colleges)
        .map(([name, stats]) => ({ 
          name, 
          ...stats, 
          efficiency: stats.registrations > 0 ? ((stats.completions / stats.registrations) * 100).toFixed(1) : "0.0"
        }))
        .sort((a, b) => b.registrations - a.registrations);
    };

    const getRecentPerformance = (records) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const stats = {};
      records.filter(r => r.startedAt || r.completedAt).forEach(r => {
        const regDate = r.startedAt ? new Date(r.startedAt) : null;
        const compPercent = parseFloat(r.completedPercent) || 0;
        const compDate = (r.completedAt && compPercent >= 100) ? new Date(r.completedAt) : null;
        
        const college = r.college || 'N/A';
        if (!stats[college]) stats[college] = { newRegs: 0, newComps: 0 };
        
        if (regDate && regDate >= thirtyDaysAgo) stats[college].newRegs++;
        if (compDate && compDate >= thirtyDaysAgo) stats[college].newComps++;
      });
      
      return Object.entries(stats)
        .map(([name, val]) => ({ name, ...val }))
        .sort((a, b) => b.newRegs - a.newRegs);
    };

    const maskEmail = (email) => {
      if (!email || !email.includes('@')) return email;
      try {
        const [username, domain] = email.split('@');
        if (username.length <= 2) return email;
        const first = username[0];
        const last = username[username.length - 1];
        const maskedContent = "*".repeat(username.length - 2);
        return `${first}${maskedContent}${last}@${domain}`;
      } catch (e) {
        return email;
      }
    };

    const GOALS_MOCK = [
      { institution: "ITI Narkatiyaganj", totalAdmissions: 200, registered: 180, totalCompleted: 150 },
      { institution: "ITI Jhanjharpur", totalAdmissions: 150, registered: 140, totalCompleted: 110 },
      { institution: "WITI Muzaffarpur", totalAdmissions: 100, registered: 95, totalCompleted: 90 },
      { institution: "ITI Hajipur", totalAdmissions: 180, registered: 160, totalCompleted: 130 },
      { institution: "ITI Hathwa", totalAdmissions: 120, registered: 110, totalCompleted: 80 },
    ];

    // --- COMPONENTS ---

    const MetricCard = ({ title, value, icon, variant = 'green' }) => (
      <div className={`w-full overflow-hidden relative group h-[110px] rounded-2xl border-2 transition-all hover:shadow-xl hover:-translate-y-1 cursor-default ${
        variant === 'green' 
          ? 'bg-white border-brand-green/20 hover:border-brand-green/40' 
          : 'bg-white border-brand-orange/20 hover:border-brand-orange/40'
      }`}>
        <div className={`absolute top-0 right-0 w-24 h-24 blur-2xl rounded-full opacity-10 transition-opacity group-hover:opacity-20 ${
          variant === 'green' ? 'bg-brand-green' : 'bg-brand-orange'
        }`}></div>
        
        <div className="relative p-5 h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h1 className={`text-[10px] font-black uppercase tracking-[0.15em] ${variant === 'green' ? 'text-brand-green' : 'text-brand-orange'}`}>{title}</h1>
            <div className={`p-2 rounded-xl ${variant === 'green' ? 'bg-brand-green/10' : 'bg-brand-orange/10'}`}>
              <i data-lucide={icon} className={`w-4 h-4 ${variant === 'green' ? 'text-brand-green' : 'text-brand-orange'}`}></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black text-brand-dark tracking-tighter">{value}</h2>
          </div>
        </div>
      </div>
    );

    const Dashboard = ({ data, onViewRegistry, lastSync, isLive }) => {
      const [selectedDivision, setSelectedDivision] = useState('All');
      const [searchQuery, setSearchQuery] = useState('');
      const [reportSearch, setReportSearch] = useState('');
      const [reportCollege, setReportCollege] = useState(null);

      const divisions = useMemo(() => {
        const unique = Array.from(new Set(data.filter(d => d.division).map(d => d.division)));
        return ['All', ...unique.sort()];
      }, [data]);

      const filteredData = useMemo(() => {
        return data.filter(record => {
          const matchDivision = selectedDivision === 'All' || record.division === selectedDivision;
          const matchSearch = String(record.college).toLowerCase().includes(searchQuery.toLowerCase());
          return matchDivision && matchSearch;
        });
      }, [data, selectedDivision, searchQuery]);

      const metrics = useMemo(() => getAggregatedMetrics(filteredData), [filteredData]);
      const collegeMetrics = useMemo(() => getCollegeMetrics(filteredData), [filteredData]);
      
      const filteredReportMetrics = useMemo(() => {
        return collegeMetrics.filter(col => 
          col.name.toLowerCase().includes(reportSearch.toLowerCase())
        );
      }, [collegeMetrics, reportSearch]);

      const top10Colleges = useMemo(() => {
        return [...collegeMetrics]
          .sort((a, b) => b.completions - a.completions)
          .slice(0, 10);
      }, [collegeMetrics]);

      const bottom10Colleges = useMemo(() => {
        return collegeMetrics
          .filter(c => {
            const eff = parseFloat(c.efficiency);
            return eff >= 30 && eff <= 50;
          })
          .sort((a, b) => a.completions - b.completions)
          .slice(0, 10);
      }, [collegeMetrics]);

      const recentPerformance = useMemo(() => getRecentPerformance(filteredData), [filteredData]);

      const genderDistribution = useMemo(() => getDistribution(filteredData, 'gender'), [filteredData]);
      const incomeDistribution = useMemo(() => getDistribution(filteredData, 'incomeLevel'), [filteredData]);
      const categoryDistribution = useMemo(() => getDistribution(filteredData, 'category'), [filteredData]);

      const CHART_COLORS = ['#31B89D', '#FF9700', '#4FD3A8', '#FFB900', '#B2FFE0', '#FCE7B3', '#12314C'];

      const commonOptions = {
        chart: { toolbar: { show: false }, zoom: { enabled: false } },
        colors: CHART_COLORS,
        legend: { position: 'bottom', fontSize: '10px', labels: { colors: '#31B89D' } },
        dataLabels: { enabled: false },
        tooltip: {
          theme: 'light',
          style: { fontSize: '12px', fontFamily: 'Inter' }
        }
      };

      const areaOptions = {
        ...commonOptions,
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.6, opacityTo: 0.05 } },
        xaxis: { labels: { style: { colors: '#31B89D', fontSize: '9px', fontWeight: 700 } } },
        yaxis: { labels: { style: { colors: '#FF9700', fontWeight: 700 } } },
        markers: { size: 5, strokeWidth: 3, hover: { size: 7 } }
      };

      useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
      }, [filteredData, reportCollege, reportSearch]);

      return (
        <div className="space-y-8 max-w-[1700px] mx-auto pb-12">
          {/* Header Progress Bar */}
          <div className="bg-white p-6 rounded-2xl flex flex-col lg:flex-row gap-6 items-center shadow-lg border-l-[12px] border-brand-orange">
            <div className="w-full lg:w-1/3">
              <h2 className="text-brand-dark text-xl font-black uppercase tracking-tighter">Live Dataset Analytics</h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-brand-green text-[10px] font-bold uppercase tracking-widest opacity-70">Real-time performance distribution</p>
                {metrics.hasData && (
                  <span className={`flex items-center gap-1 ${isLive ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-orange/10 text-brand-orange'} px-2 py-0.5 rounded text-[8px] font-bold uppercase`}>
                    {isLive ? 'Live Sync Active' : 'Offline / Demo Mode'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row gap-4 items-center justify-center w-full">
              <select 
                className="w-full md:w-auto bg-brand-bg border border-slate-200 text-xs font-black uppercase text-brand-dark rounded-xl px-6 py-3 focus:outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
              >
                {divisions.map(d => <option key={d} value={d} className="bg-white">{d}</option>)}
              </select>

              <div className="relative w-full md:w-96">
                <i data-lucide="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                <input 
                  placeholder="Scan Colleges..."
                  className="w-full pl-12 pr-4 py-3 bg-brand-bg border border-slate-200 rounded-xl text-xs font-bold text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:bg-white transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="w-full lg:w-1/3 flex justify-center lg:justify-end">
              {lastSync && (
                <div className="flex flex-col items-center lg:items-end">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">System Last Synced</span>
                  <span className="text-[10px] font-black text-brand-green bg-brand-green/5 px-2 py-1 rounded mt-1">{lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Core Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard title="Total Registrations" value={metrics.registrations} icon="users" variant="green" />
            <MetricCard title="Completed Cases" value={metrics.completions} icon="check-circle" variant="green" />
            <MetricCard title="Muzaffarpur Zone" value={metrics.muzProgress} icon="map-pin" variant="orange" />
            <MetricCard title="Patna Zone" value={metrics.patnaProgress} icon="trending-up" variant="orange" />
            
            <div className="w-full h-[110px] bg-gradient-to-br from-brand-orange to-brand-orange-light rounded-2xl shadow-lg p-5 flex flex-col justify-between transition-all hover:shadow-brand-orange/30 hover:-translate-y-1 cursor-default group border-2 border-brand-orange">
               <div className="flex justify-between items-start">
                 <h1 className="text-[10px] font-black text-white uppercase tracking-wider">30D Comp Success</h1>
                 <div className="p-2 rounded-xl bg-white/20 group-hover:bg-white/30 transition-colors">
                   <i data-lucide="trending-up" className="w-4 h-4 text-white"></i>
                 </div>
               </div>
               <div className="flex items-baseline justify-between">
                 <h2 className="text-3xl font-black text-white tracking-tighter">+{metrics.recentComps}</h2>
                 <span className="text-[8px] font-bold text-white/80 uppercase">Finalized</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* College Performance Analysis */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Top 10 Colleges */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-green flex items-center gap-2">
                      <i data-lucide="award" className="w-4 h-4 text-brand-green"></i>
                      Top 10 Colleges (Completions)
                    </h3>
                  </div>
                  <div className="h-[350px] p-4">
                    <Chart 
                      type="bar" 
                      height="100%" 
                      series={[
                        { name: 'Registrations', data: top10Colleges.map(c => c.registrations) },
                        { name: 'Completions', data: top10Colleges.map(c => c.completions) }
                      ]}
                      options={{
                        ...commonOptions,
                        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
                        xaxis: { categories: top10Colleges.map(c => c.name), labels: { style: { fontSize: '8px', fontWeight: 900 } } },
                        colors: ['#4FD3A8', '#31B89D']
                      }}
                    />
                  </div>
                </div>

                {/* Bottom 10 Colleges (30-50% Efficiency) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-orange flex items-center gap-2">
                      <i data-lucide="alert-circle" className="w-4 h-4 text-brand-orange"></i>
                      Critical Watch: Bottom 10 (30-50% Eff.)
                    </h3>
                  </div>
                  <div className="h-[350px] p-4">
                    {bottom10Colleges.length > 0 ? (
                      <Chart 
                        type="bar" 
                        height="100%" 
                        series={[
                          { name: 'Registrations', data: bottom10Colleges.map(c => c.registrations) },
                          { name: 'Completions', data: bottom10Colleges.map(c => c.completions) }
                        ]}
                        options={{
                          ...commonOptions,
                          plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
                          xaxis: { categories: bottom10Colleges.map(c => c.name), labels: { style: { fontSize: '8px', fontWeight: 900 } } },
                          colors: ['#FFB900', '#FF9700']
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 font-bold text-[10px] uppercase">No Colleges in 30-50% Range</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Insight Analysis Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-6 text-center">Gender Demographics</h3>
                   <div className="h-[280px]">
                     <Chart options={{...commonOptions, labels: genderDistribution.map(d => d.name)}} series={genderDistribution.map(d => d.value)} type="donut" height="100%" />
                   </div>
                </div>
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-orange mb-6 text-center">Category Distribution</h3>
                   <div className="h-[280px]">
                     <Chart options={{...commonOptions, labels: categoryDistribution.map(d => d.name)}} series={categoryDistribution.map(d => d.value)} type="pie" height="100%" />
                   </div>
                </div>
                <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-6">Family Income Level Analysis</h3>
                   <div className="h-[350px]">
                     <Chart 
                       options={{
                         ...commonOptions, 
                         plotOptions: { bar: { horizontal: true, borderRadius: 6 } }, 
                         xaxis: { categories: incomeDistribution.map(d => d.name) },
                         colors: ['#4FD3A8']
                       }} 
                       series={[{ name: 'Count', data: incomeDistribution.map(d => d.value) }]} 
                       type="bar" 
                       height="100%" 
                     />
                   </div>
                </div>
              </div>
            </div>

            {/* Side Reports Panel */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-brand-green flex items-center gap-2">
                    <i data-lucide="file-text" className="w-4 h-4 text-brand-green"></i>
                    Performance Reports
                  </h3>
                  <div className="relative">
                    <i data-lucide="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400"></i>
                    <input 
                      type="text"
                      placeholder="Find College..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[1050px] p-2 space-y-3 no-scrollbar mt-2">
                  {filteredReportMetrics.length > 0 ? filteredReportMetrics.map((col, idx) => (
                    <div 
                      key={idx} 
                      className={`p-5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                        parseFloat(col.efficiency) > 70 
                          ? 'bg-brand-green/5 border-brand-green/20 hover:border-brand-green hover:shadow-brand-green/10' 
                          : 'bg-brand-orange/5 border-brand-orange/20 hover:border-brand-orange hover:shadow-brand-orange/10 shadow-sm'
                      }`}
                      onClick={() => setReportCollege(col.name)}
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-green opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <span className="text-[11px] font-black text-brand-dark group-hover:text-brand-green transition-colors uppercase truncate w-40">{col.name}</span>
                        <span className={`text-[9px] font-black py-1 px-2 rounded-lg transition-colors ${
                          parseFloat(col.efficiency) > 70 ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-orange/10 text-brand-orange'
                        }`}>
                          {col.efficiency}% EFF
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2 relative z-10">
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Registrations</span>
                          <span className="text-[12px] font-black text-brand-dark">{col.registrations}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Completions</span>
                          <span className={`text-[12px] font-black ${parseFloat(col.efficiency) > 70 ? 'text-brand-green' : 'text-brand-orange'}`}>{col.completions}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest italic border-2 border-dashed border-slate-100 rounded-xl m-2">
                      No Matches Found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Performance Modal */}
          {reportCollege && (
            <div className="fixed inset-0 bg-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                <div className="bg-brand-orange text-white p-8 text-white flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">{reportCollege}</h2>
                    <p className="text-brand-green-pale text-[10px] font-bold uppercase tracking-widest mt-1">Detailed Performance Blueprint</p>
                  </div>
                  <button 
                    onClick={() => setReportCollege(null)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                  >
                    <i data-lucide="x" className="w-6 h-6"></i>
                  </button>
                </div>
                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime Admissions</p>
                      <h4 className="text-3xl font-black text-dark">{data.filter(d => d.college === reportCollege).length}</h4>
                    </div>
                    <div className="bg-brand/5 p-6 rounded-2xl border border-brand/20">
                      <p className="text-[9px] font-black text-brand uppercase tracking-widest mb-1">Final Completions</p>
                      <h4 className="text-3xl font-black text-brand">{data.filter(d => d.college === reportCollege && d.completedPercent >= 100).length}</h4>
                    </div>
                    <div className="bg-accent/5 p-6 rounded-2xl border border-accent/20">
                      <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-1">30D Comp. Delta</p>
                      <h4 className="text-3xl font-black text-accent">
                        +{recentPerformance.find(p => p.name === reportCollege)?.newComps || 0}
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Overall Progress Chart */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-4">Overall Funnel Analysis</h5>
                      <div className="h-[250px]">
                        <Chart 
                          type="bar" 
                          height="100%"
                          series={[{
                            name: 'Count',
                            data: [
                              data.filter(d => d.college === reportCollege).length,
                              data.filter(d => d.college === reportCollege && d.completedPercent >= 100).length
                            ]
                          }]}
                          options={{
                            ...commonOptions,
                            plotOptions: { bar: { distributed: true, borderRadius: 8, columnWidth: '50%' } },
                            xaxis: { categories: ['Total Registered', 'Total Completed'], labels: { style: { fontWeight: 900 } } },
                            colors: ['#FF9700', '#31B89D']
                          }}
                        />
                      </div>
                    </div>

                    {/* Gender Analysis Chart */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-brand-orange mb-4">Gender-wise Distribution</h5>
                      <div className="h-[250px]">
                        {(() => {
                          const genders = Array.from(new Set(data.filter(d => d.college === reportCollege).map(d => d.gender || 'N/A')));
                          const regData = genders.map(g => data.filter(d => d.college === reportCollege && d.gender === g).length);
                          const compData = genders.map(g => data.filter(d => d.college === reportCollege && d.gender === g && d.completedPercent >= 100).length);
                          return (
                            <Chart 
                              type="bar" 
                              height="100%"
                              series={[
                                { name: 'Registered', data: regData },
                                { name: 'Completed', data: compData }
                              ]}
                              options={{
                                ...commonOptions,
                                plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
                                xaxis: { categories: genders, labels: { style: { fontWeight: 900 } } },
                                colors: ['#4FD3A8', '#FF9700']
                              }}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    {/* Trade Analysis Chart */}
                    <div className="md:col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-brand-green mb-4">Trade-wise Registration vs Completion</h5>
                      <div className="h-[350px]">
                        {(() => {
                          const trades = Array.from(new Set(data.filter(d => d.college === reportCollege).map(d => d.trade || 'N/A'))).slice(0, 10);
                          const regData = trades.map(t => data.filter(d => d.college === reportCollege && d.trade === t).length);
                          const compData = trades.map(t => data.filter(d => d.college === reportCollege && d.trade === t && d.completedPercent >= 100).length);
                          return (
                            <Chart 
                              type="bar" 
                              height="100%"
                              series={[
                                { name: 'Registered', data: regData },
                                { name: 'Completed', data: compData }
                              ]}
                              options={{
                                ...commonOptions,
                                plotOptions: { bar: { borderRadius: 4, columnWidth: '70%' } },
                                xaxis: { categories: trades, labels: { style: { fontSize: '9px', fontWeight: 900 } } },
                                colors: ['#FFB900', '#31B89D']
                              }}
                            />
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                   <button 
                     onClick={() => {
                       onViewRegistry(reportCollege);
                       setReportCollege(null);
                     }}
                     className="px-6 py-3 bg-accent text-white font-black uppercase rounded-xl tracking-widest text-[10px] shadow-lg shadow-accent/20 hover:scale-105 transition-all flex items-center gap-2"
                   >
                     <i data-lucide="users" className="w-3 h-3"></i> View Students
                   </button>
                   <button onClick={() => setReportCollege(null)} className="px-6 py-3 bg-brand text-white font-black uppercase rounded-xl tracking-widest text-[10px] shadow-lg shadow-brand/20 hover:scale-105 transition-all">Close Report View</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    const downloadCSV = (data, filename) => {
      if (data.length === 0) return;
      const headers = ['firstName', 'lastName', 'college', 'division', 'district', 'trade', 'status', 'completedPercent'];
      const csvRows = [];
      csvRows.push(headers.join(','));
      
      for (const row of data) {
        const values = headers.map(header => {
          const val = row[header] === undefined || row[header] === null ? '' : row[header];
          const escaped = ('' + val).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    const StudentTable = ({ data, initialSearch = '', onSearchChange }) => {
      const [searchQuery, setSearchQuery] = useState(initialSearch);
      const [statusFilter, setStatusFilter] = useState('All');

      useEffect(() => {
        setSearchQuery(initialSearch);
      }, [initialSearch]);

      const filtered = data.filter(d => {
        const matchesSearch = 
          String(d.firstName).toLowerCase().includes(searchQuery.toLowerCase()) || 
          String(d.lastName).toLowerCase().includes(searchQuery.toLowerCase()) || 
          String(d.college).toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      });

      return (
        <div className="p-4 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4 transition-all hover:border-brand-green/30">
            <h2 className="text-xl font-black uppercase tracking-tighter text-brand-dark flex items-center gap-3">
              <span className="w-2 h-8 bg-brand-green rounded-full"></span>
              Student Registry
            </h2>
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <button 
                onClick={() => downloadCSV(filtered, `student_report_${new Date().toISOString().slice(0,10)}.csv`)}
                className="flex items-center gap-2 bg-brand-green text-white text-[10px] font-black uppercase px-5 py-3 rounded-xl shadow-lg shadow-brand-green/20 hover:scale-105 active:scale-95 transition-all outline-none"
              >
                <i data-lucide="download" className="w-4 h-4"></i> Export CSV
              </button>
              
              <select 
                className="bg-brand-bg border border-slate-200 text-[10px] font-black uppercase rounded-xl px-5 py-3 outline-none cursor-pointer hover:bg-slate-100 transition-colors text-brand-dark"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
              </select>

              <div className="relative flex-1 md:w-72">
                <i data-lucide="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                <input 
                  placeholder="Search student profiles..."
                  className="w-full pl-12 pr-4 py-3 bg-brand-bg border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-green/20 focus:bg-white transition-all text-brand-dark"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (onSearchChange) onSearchChange(e.target.value);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-[#effefb] text-brand-green text-[10px] font-black uppercase tracking-[0.15em] border-b border-brand-green/20">
                <tr>
                  <th className="px-8 py-5">Student Identity</th>
                  <th className="px-8 py-5">Educational Institution</th>
                  <th className="px-8 py-5 text-center">Outcome State</th>
                  <th className="px-8 py-5">Skill Domain</th>
                </tr>
              </thead>
              <tbody className="text-xs text-brand-dark">
                {filtered.map((s, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-brand-green/5 transition-colors group">
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[13px] group-hover:text-brand-green transition-colors">{s.firstName} {s.lastName}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{s.email ? maskEmail(s.email) : 'NO EMAIL STORED'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 font-bold text-slate-500">{s.college}</td>
                    <td className="px-8 py-4">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest shadow-sm ${s.status === 'Completed' ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'bg-brand-orange/10 text-brand-orange border border-brand-orange/20'}`}>
                          {s.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4 font-bold uppercase tracking-wider text-[10px] text-slate-600">{s.trade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    const App = () => {
      const [activeTab, setActiveTab] = useState('overview');
      const [registryFilter, setRegistryFilter] = useState('');
      const [data, setData] = useState([]);
      const [loading, setLoading] = useState(true);
      const [lastSync, setLastSync] = useState(null);
      const [isLive, setIsLive] = useState(false);

      const fetchData = async () => {
        const mockData = [
          { firstName: "Ramesh", lastName: "Singh", college: "ITI Narkatiyaganj", status: "Completed", division: "Muzaffarpur", gender: "Male", incomeLevel: "Low", trade: "Electrician", category: "General", completedPercent: 100, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
          { firstName: "Anjali", lastName: "Kumari", college: "ITI Jhanjharpur", status: "In Progress", division: "Patna", gender: "Female", incomeLevel: "Medium", trade: "Fitter", category: "OBC", completedPercent: 45, startedAt: new Date().toISOString() },
          { firstName: "Suresh", lastName: "Prasad", college: "ITI Sitamarhi", status: "Completed", division: "Muzaffarpur", gender: "Male", incomeLevel: "Low", trade: "Welder", category: "SC", completedPercent: 100, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
          { firstName: "Priyanka", lastName: "Devi", college: "WITI Muzaffarpur", status: "Completed", division: "Muzaffarpur", gender: "Female", incomeLevel: "Low", trade: "COPA", category: "General", completedPercent: 100, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
        ];

        const normalize = (key) => String(key).toLowerCase().trim().replace(/[^a-z0-9]/g, '');

        // 1. Try Google Apps Script Native 
        if (typeof google !== 'undefined' && google.script && google.script.run) {
           console.log("Sync Action: Initializing via GAS native...");
           google.script.run
            .withSuccessHandler((result) => {
              setData(result && result.length > 0 ? result : mockData);
              setLoading(false);
              setLastSync(new Date());
              setIsLive(true);
            })
            .withFailureHandler((err) => {
              console.error("Sync Failure (GAS):", err);
              setData(mockData);
              setLoading(false);
              setIsLive(false);
            })
            .getSpreadsheetData();
          return;
        }

        // 2. Try External CSV (GitHub/Public Link)
        if (GOOGLE_SHEET_CSV_URL) {
          console.log("Sync Action: Initializing via CSV Download...");
          const cleanUrl = GOOGLE_SHEET_CSV_URL.trim();
          
          Papa.parse(cleanUrl, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                const processed = results.data.map((row, index) => {
                  let obj = {};
                  Object.keys(row).forEach(key => { obj[normalize(key)] = row[key]; });

                  // Map Logic
                  const rawCollege = obj.college || obj.itiname || obj.itipname || obj.institution || '';
                  const collegeName = String(rawCollege).replace(/^Government Industrial Training Institute\s+/i, 'GITI ').trim();
                  const divisionName = obj.division || obj.zone || obj.region || 'Unassigned';

                  let completedValue = 0;
                  const compKey = Object.keys(obj).find(k => 
                    (k.includes('percent') || k === 'completed' || k === 'completion' || k.includes('progress')) && !k.includes('at')
                  );
                  if (compKey) {
                    let rawVal = obj[compKey];
                    if (typeof rawVal === 'string') rawVal = parseFloat(rawVal.replace('%', ''));
                    completedValue = parseFloat(rawVal) || 0;
                  }

                  const statusStr = String(obj.status || '').toLowerCase();
                  const finalized = (statusStr.includes('complete') || statusStr.includes('finish') || completedValue >= 100);

                  return {
                    id: index + 1,
                    firstName: obj.firstname || obj.studentname?.split(' ')[0] || "Student",
                    lastName: obj.lastname || obj.studentname?.split(' ').slice(1).join(' ') || `#${index+1}`,
                    email: obj.email || obj.emailid || '',
                    college: collegeName || 'Unknown ITI',
                    division: divisionName,
                    district: obj.district || obj.homedistrict || '',
                    trade: obj.trade || obj.tradename || obj.subject || '',
                    status: finalized ? 'Completed' : 'In Progress',
                    gender: obj.gender || obj.sex || 'Not Specified',
                    category: obj.category || obj.socialcategory || 'General',
                    incomeLevel: obj.incomelevel || obj.familyincome || 'Not Specified',
                    startedAt: obj.startedat || obj.registrationdate || '',
                    completedAt: obj.completedat || obj.completiondate || '',
                    completedPercent: finalized ? 100 : completedValue
                  };
                });
                setData(processed);
                setLastSync(new Date());
                setIsLive(true);
              } else {
                console.warn("Sync Notice: No records found in CSV, using demo data.");
                setData(mockData);
                setIsLive(false);
              }
              setLoading(false);
            },
            error: (err) => {
              console.error("Sync Failure (Download/Parse):", err);
              setData(mockData);
              setLoading(false);
              setIsLive(false);
            }
          });
          return;
        }

        // 3. Absolute Fallback
        setTimeout(() => {
          setData(mockData);
          setLoading(false);
          setLastSync(new Date());
          setIsLive(false);
        }, 1000);
      };

      useEffect(() => {
        fetchData();
        
        // Automatic update every 60 seconds
        const pollInterval = setInterval(fetchData, 60000);
        return () => clearInterval(pollInterval);
      }, []);

      useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
      }, [activeTab, loading]);

      if (loading) return (
        <div className="flex items-center justify-center h-screen bg-brand-bg text-brand-dark">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-black uppercase tracking-widest text-[10px] text-brand-green">Synchronizing Platform...</p>
          </div>
        </div>
      );

      return (
        <div className="min-h-screen flex flex-col">
          <header className="bg-white text-brand-dark py-12 lg:py-20 px-6 lg:px-8 text-center border-b-[8px] border-brand-green relative flex flex-col items-center justify-center overflow-hidden shadow-sm">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-orange/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-[100px] pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 w-[120%] h-40 bg-brand-green-pale/10 -translate-x-1/2 -translate-y-1/2 -rotate-12 blur-[80px] pointer-events-none"></div>

            {/* ITI Logo - Top Left */}
            <div className="absolute left-4 top-4 lg:left-12 lg:top-12 bg-white/50 p-2 rounded-2xl backdrop-blur-md shadow-sm border border-brand-green/10 transition-transform hover:scale-105 z-20">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Directorate_General_of_Employment_and_Training_%28DGET%29_India.png/240px-Directorate_General_of_Employment_and_Training_%28DGET%29_India.png" 
                alt="ITI Logo" 
                className="h-10 lg:h-20 w-auto object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            
            {/* Medha Logo - Top Right */}
            <div className="absolute right-4 top-4 lg:right-12 lg:top-12 bg-white/50 p-2 rounded-2xl backdrop-blur-md shadow-sm border border-brand-orange/10 transition-transform hover:scale-105 z-20">
              <img 
                src="https://www.medha.org.in/wp-content/uploads/2021/04/Medha-Logo-01.png" 
                alt="Medha Logo" 
                className="h-10 lg:h-20 w-auto object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            
            <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center">
              <div className="inline-flex items-center gap-2 bg-brand-green/10 border border-brand-green/20 px-4 py-1.5 rounded-full mb-6">
                <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse shadow-[0_0_8px_#31B89D]"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-green">Real-time Platform</span>
              </div>
              <h1 className="text-5xl lg:text-8xl font-black tracking-tighter uppercase mb-6 leading-none text-brand-dark">
                AI Progress <span className="text-brand-orange relative">Dashboard
                  <span className="absolute -bottom-2 left-0 w-full h-3 bg-brand-orange-pale -rotate-1 -z-10 rounded"></span>
                </span>
              </h1>
              <div className="h-1.5 w-32 bg-brand-green rounded-full mb-6 shadow-sm"></div>
              <p className="text-xs lg:text-xl font-bold tracking-[0.4em] text-slate-500 uppercase">Skill Tracking & Performance Blueprint</p>
            </div>
          </header>

          <div className="lg:hidden flex bg-white border-b border-slate-200">
            <button onClick={() => setActiveTab('overview')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'overview' ? 'text-brand border-b-2 border-brand' : 'text-slate-400'}`}>
              <i data-lucide="layout-dashboard" className="w-3 h-3"></i> Overview
            </button>
            <button onClick={() => setActiveTab('students')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'students' ? 'text-brand border-b-2 border-brand' : 'text-slate-400'}`}>
              <i data-lucide="users" className="w-3 h-3"></i> Registry
            </button>
          </div>

          <div className="flex flex-1">
            <aside className="w-64 border-r border-slate-200 bg-white hidden lg:flex flex-col p-6 space-y-6">
              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${activeTab === 'overview' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <i data-lucide="layout-dashboard" className="w-4 h-4"></i> Overview
                </button>
                <button 
                  onClick={() => setActiveTab('students')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${activeTab === 'students' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <i data-lucide="users" className="w-4 h-4"></i> Registry
                </button>
              </nav>
            </aside>

            <main className="flex-1 p-4 lg:p-8 bg-[#F2F2F2]">
              {activeTab === 'overview' ? (
                <Dashboard 
                  data={data} 
                  lastSync={lastSync}
                  isLive={isLive}
                  onViewRegistry={(college) => {
                    setRegistryFilter(college);
                    setActiveTab('students');
                  }}
                />
              ) : (
                <StudentTable 
                  data={data} 
                  initialSearch={registryFilter}
                  onSearchChange={setRegistryFilter}
                />
              )}
            </main>
          </div>

          <footer className="bg-brand-green text-white px-4 lg:px-8 py-4 flex flex-col lg:flex-row justify-between items-center text-[8px] lg:text-[9px] font-black tracking-[0.1em] lg:tracking-[0.25em] uppercase gap-2 lg:gap-0">
            <div className="flex flex-col lg:flex-row items-center gap-2 lg:gap-8 text-center lg:text-left">
              <span className="flex items-center gap-2 italic">
                <i data-lucide="database" className="w-3 h-3 text-white"></i>
                DATA SOURCE: GOOGLE SHEETS
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>© BIHAR GOVERNMENT / DSDA</span>
            </div>
          </footer>
        </div>
      );
    };

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>

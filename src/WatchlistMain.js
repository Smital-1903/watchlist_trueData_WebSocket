// import React, { useEffect, useState, useRef } from "react";
// import { DockviewReact } from "dockview";
// import "dockview/dist/styles/dockview.css";

// // Import your existing components
// import WatchlistSearch from "./WatchlistSearch";
// import WatchlistDisplay from "./WatchlistDisplay";

// // --- 1. DEFINE WRAPPERS THAT READ PROPS.PARAMS ---

// const SearchPanel = (props) => {
//   // Dockview passes data inside 'props.params'
//   const { status, credentials, handleLogin, handleAddSymbol, handleLogout } = props.params;
  
//   return (
//     <div style={{ padding: "10px", height: "100%", overflowY: "auto", background: "white" }}>
//         <WatchlistSearch 
//             status={status || "Disconnected"} 
//             onSubscribe={handleAddSymbol} 
//             onLogin={handleLogin} 
//             onLogout={handleLogout}
//             credentials={credentials}
//         />
//     </div>
//   );
// };

// const TablePanel = (props) => {
//   const { marketData, handleRemoveSymbol } = props.params;

//   return (
//     <div style={{ height: "100%", overflow: "auto", background: "white" }}>
//         <WatchlistDisplay 
//             marketData={marketData || {}} 
//             onRemove={handleRemoveSymbol} 
//         />
//     </div>
//   );
// };

// // Define the component map
// const components = {
//   search_component: SearchPanel,
//   table_component: TablePanel,
// };

// export default function WatchlistMain() {
//   // --- EXISTING LOGIC STARTS HERE ---
//   const dsymbolList = ["NIFTY 50", "GOLD-I", "SENSEX1_BSE"];
//   const [marketData, setMarketData] = useState({});
//   const [status, setStatus] = useState("Disconnected");
  
//   const [credentials, setCredentials] = useState(() => {
//     const saved = localStorage.getItem("td_credentials");
//     try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
//   });

//   const ws = useRef(null);
//   const idToNameMap = useRef({}); 
  
//   // NEW: Ref to hold the Dockview API
//   const dockApi = useRef(null);

//   // --- WEBSOCKET LOGIC (Same as before) ---
//   useEffect(() => {
//     if (!credentials) {
//         if (ws.current) ws.current.close();
//         setStatus("Disconnected");
//         setMarketData({}); 
//         return;
//     }

//     setStatus("Connecting...");
//     const { user, pass } = credentials;
//     const wsUrl = `wss://push.truedata.in:8082?user=${user}&password=${pass}`;

//     ws.current = new WebSocket(wsUrl);

//     ws.current.onopen = () => { 
//         setStatus("Connected (Ready)");
//         if (ws.current && ws.current.readyState === WebSocket.OPEN) {
//              ws.current.send(JSON.stringify({ method: "addsymbol", symbols: dsymbolList }));
//         }
//     }
//     ws.current.onclose = () => setStatus("Disconnected");
//     ws.current.onerror = () => setStatus("Connection Error");

//     ws.current.onmessage = (event) => {
//       const msg = JSON.parse(event.data);

//       if (msg.message === "TrueData Real Time Data Service") {
//           if (msg.success) setStatus("Connected (Ready)");
//       } 
//       else if (msg.symbollist) {
//         msg.symbollist.forEach((item) => {
//           if (!Array.isArray(item)) return;
//           const symName = item[0]; const symID = item[1];   
//           if (symName.includes("Invalid")) return;
//           idToNameMap.current[symID] = symName;
//           setMarketData((prev) => ({
//             ...prev,
//             [symName]: {
//               name: item[0], id: item[1], time: item[2], ltp: item[3], ltq: item[4], atp: item[5], 
//               volume: item[6], open: item[7], high: item[8], low: item[9], close: item[10], 
//               oi: item[11], poic: item[12], turnover: item[13], bid: item[14], bidqty: item[15], 
//               ask: item[16], askqty: item[17], color: "transparent"
//             }
//           }));
//         });
//       } 
//       else if (msg.trade) {
//         if (!Array.isArray(msg.trade) || msg.trade.length < 5) return;
//         const trade = msg.trade;
//         const rawKey = trade[0];
//         const realName = idToNameMap.current[rawKey] || rawKey;

//         setMarketData((prev) => {
//             const oldData = prev[realName];
//             const newLTP = parseFloat(trade[2]);
//             const oldLTP = oldData ? parseFloat(oldData.ltp) : newLTP;
//             let newColor = oldData?.color || "transparent"; 
//             if (newLTP > oldLTP) newColor = "#a7f2a7"; 
//             else if (newLTP < oldLTP) newColor = "#ff6b6b";

//             return {
//               ...prev,
//               [realName]: {
//                 ...oldData, name: realName, id: rawKey,
//                 time: trade[1], ltp: trade[2], ltq: trade[3], atp: trade[4], volume: trade[5],
//                 open: trade[6], high: trade[7], low: trade[8], close: trade[9], oi: trade[10],
//                 poic: trade[11], turnover: trade[12], tick: trade[14], bid: trade[15],
//                 bidqty: trade[16], ask: trade[17], askqty: trade[18], color: newColor
//               }
//             };
//         });
//       }
//     };
//     return () => { if (ws.current) ws.current.close(); };
//   }, [credentials]);

//   const handleLogin = (user, pass) => {
//       if (user && pass) {
//           const newCreds = { user, pass };
//           localStorage.setItem("td_credentials", JSON.stringify(newCreds));
//           setCredentials(newCreds);
//       } else {
//           localStorage.removeItem("td_credentials");
//           setCredentials(null);
//           setMarketData({});
//       }
//   };

//   const handleAddSymbol = (symbol) => {
//     if (ws.current && ws.current.readyState === WebSocket.OPEN) {
//       ws.current.send(JSON.stringify({ method: "addsymbol", symbols: [symbol.toUpperCase()] }));
//     }
//   };

//   const handleRemoveSymbol = (symName, symID) => {
//     if (ws.current && ws.current.readyState === WebSocket.OPEN) {
//         const symbolsToRemove = [];
//         if (symName) symbolsToRemove.push(symName);
//         if (symID) symbolsToRemove.push(symID);
//         ws.current.send(JSON.stringify({ method: "removesymbol", symbols: symbolsToRemove }));
//     }
//     setMarketData((prev) => {
//         const newData = {};
//         Object.keys(prev).forEach((key) => {
//             const row = prev[key];
//             const isMatch = (symName && row.name === symName) || (symID && row.id === symID);
//             if (!isMatch) newData[key] = row;
//         });
//         return newData;
//     });
//   };

//   // --- 2. THE MAGIC: PUSH DATA UPDATES TO DOCKVIEW ---
  
//   // Whenever 'marketData' changes (every tick), we push it to the Table Panel
//   useEffect(() => {
//       if (dockApi.current) {
//           const tablePanel = dockApi.current.getPanel("panel_table");
//           // FIX: Access .api before calling updateParameters
//           if (tablePanel && tablePanel.api) {
//               tablePanel.api.updateParameters({ marketData: marketData, handleRemoveSymbol });
//           }
//       }
//   }, [marketData]);

//   // Whenever 'status' or 'credentials' change, we push it to the Search Panel
//   useEffect(() => {
//     if (dockApi.current) {
//         const searchPanel = dockApi.current.getPanel("panel_search");
//         // FIX: Access .api before calling updateParameters
//         if (searchPanel && searchPanel.api) {
//             searchPanel.api.updateParameters({ 
//                 status, credentials, handleLogin, handleAddSymbol, handleLogout: handleLogin 
//             });
//         }
//     }
//   }, [status, credentials]);

//   // --- 3. SETUP DOCKVIEW ---
//   const onReady = (event) => {
//     const api = event.api;
//     dockApi.current = api; // Save API for later use

//     // Panel A: Search (Top)
//     api.addPanel({
//       id: "panel_search",
//       component: "search_component",
//       title: "Serach",
//       size: 140,
//       // Pass INITIAL parameters
//       params: { status, credentials, handleLogin, handleAddSymbol }
//     });

//     // Panel B: Table (Bottom)
//     api.addPanel({
//       id: "panel_table",
//       component: "table_component",
//       title: "Watchlist",
//       position: { referencePanel: "panel_search", direction: "below" },
//       // Pass INITIAL parameters
//       params: { marketData, handleRemoveSymbol }
//     });
//   };

  

//   return (
//     <div style={{ height: "100vh", width: "100vw", background: "#e1e1e1" }}>
//         <DockviewReact 
//             components={components} 
//             onReady={onReady} 
//             className="dockview-theme-dark" 
//         />
//     </div>
//   );
// }


import React, { useEffect, useState, useRef } from "react";
import WatchlistSearch from "./WatchlistSearch";
import WatchlistDisplay from "./WatchlistDisplay";

export default function WatchlistMain() {

   const dsymbolList = ["NIFTY 50", "GOLD-I", "SENSEX1_BSE"] 
  const [marketData, setMarketData] = useState({});
  const [status, setStatus] = useState("Disconnected");
  
  const [credentials, setCredentials] = useState(() => {
    const saved = localStorage.getItem("td_credentials");
    return saved ? JSON.parse(saved) : null;
});
 

  const ws = useRef(null);
  const idToNameMap = useRef({}); 
  useEffect(() => {
   
    if (!credentials) return;

    setStatus("Connecting...");
    const { user, pass } = credentials;
    const wsUrl = `wss://push.truedata.in:8082?user=${user}&password=${pass}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () =>{ 
        setStatus("Connected (Ready)");
        if (ws.current && ws.current.readyState) {
      ws.current.send(JSON.stringify({ 
        method: "addsymbol", 
        symbols:dsymbolList,
    }));
    }
    }
    ws.current.onclose = () => setStatus("Disconnected");
    ws.current.onerror = () => setStatus("Connection Error");

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.message === "TrueData Real Time Data Service") {
          if (msg.success) setStatus("Connected (Ready)");
      } 
      else if (msg.symbollist) {
        msg.symbollist.forEach((item) => {
          if (!Array.isArray(item)) return;
          const symName = item[0]; 
          const symID = item[1];   
          if (symName.includes("Invalid")) return;
          idToNameMap.current[symID] = symName;
          setMarketData((prev) => ({
            ...prev,
            [symName]: {
              name: item[0], 
              id: item[1], 
              time: item[2], 
              ltp: item[3], 
              ltq: item[4], 
              atp: item[5], 
              volume: item[6],
              open: item[7], 
              high: item[8], 
              low: item[9], 
              close: item[10], 
              oi: item[11], 
              poic: item[12], 
              turnover: item[13], 
              bid: item[14], 
              bidqty: item[15], 
              ask: item[16], 
              askqty: item[17], 
              color: "transparent"
            }
          }));
        });
      } 
      else if (msg.trade) {
        if (!Array.isArray(msg.trade) || msg.trade.length < 5) return;
        const trade = msg.trade;
        const rawKey = trade[0];
        const realName = idToNameMap.current[rawKey] || rawKey;

        setMarketData((prev) => {
            const oldData = prev[realName];
            const newLTP = parseFloat(trade[2]);
            const oldLTP = oldData ? parseFloat(oldData.ltp) : newLTP;
            let newColor = oldData?.color || "transparent"; 
            if (newLTP > oldLTP) newColor = "#a7f2a7"; 
            else if (newLTP < oldLTP) newColor = "#ff6b6b";

            return {
              ...prev,
              [realName]: {
                ...oldData, 
                name: realName, 
                id: rawKey,
                time: trade[1], 
                ltp: trade[2], 
                ltq: trade[3], 
                atp: trade[4], 
                volume: trade[5],
                open: trade[6], 
                high: trade[7], 
                low: trade[8], 
                close: trade[9], 
                oi: trade[10],
                poic: trade[11], 
                turnover: trade[12], 
                tick: trade[14], 
                bid: trade[15],
                bidqty: trade[16], 
                ask: trade[17], 
                askqty: trade[18], 
                color: newColor
              }
            };
        });
      }
    };

    return () => { if (ws.current) ws.current.close(); };
  }, [credentials]); 
  
  const handleLogin = (user, pass) => {
    const newCreds = { user, pass };
    localStorage.setItem("td_credentials", JSON.stringify(newCreds));
    setCredentials(newCreds);
};
 const handleLogout = (user, pass) => {
    const newCreds = { user, pass };
    localStorage.removeItem("td_credentials");
    setCredentials(null);
    setMarketData("");
};

//   const handleLogin = (user, pass) => {
//        setCredentials({ user, pass });
//   };



  const handleAddSymbol = (symbol) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ 
        method: "addsymbol", 
        symbols: [symbol.toUpperCase()],
    }));
    }
  };

  const handleRemoveSymbol = (symName, symID) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        const symbolsToRemove = [];
        if (symName) symbolsToRemove.push(symName);
        if (symID) symbolsToRemove.push(symID);
        ws.current.send(JSON.stringify({ method: "removesymbol", symbols: symbolsToRemove }));
    }
    setMarketData((prev) => {
        const newData = {};
        Object.keys(prev).forEach((key) => {
            const row = prev[key];
            const isMatch = (symName && row.name === symName) || (symID && row.id === symID);
            if (!isMatch) newData[key] = row;
        });
        return newData;
    });
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif", height: "100vh" }}>
        {/* Pass Login Handler and Status down */}
        <WatchlistSearch 
            status={status} 
            onSubscribe={handleAddSymbol} 
            onLogin={handleLogin}
            onLogout={handleLogout} 
            credentials={credentials}
        />
        
        {/* Table Display */}
        <WatchlistDisplay 
            marketData={marketData} 
            onRemove={handleRemoveSymbol} 
            onLogout={handleLogout} 
        />
    </div>
  );
}
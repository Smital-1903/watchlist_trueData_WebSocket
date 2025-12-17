import React, { useEffect, useState, useRef } from "react";

export default function TrueDataDynamicTable() {
  const [inputText, setInputText] = useState("");
  const [marketData, setMarketData] = useState({});
  const [status, setStatus] = useState("Connecting...");
  
  const ws = useRef(null);
  
  // Bridge to link ID -> Name (e.g., "100001528" -> "TCS")
  const idToNameMap = useRef({}); 

  useEffect(() => {
    ws.current = new WebSocket("wss://push.truedata.in:8082?user=td131&password=smital@131");

    ws.current.onopen = () => setStatus("Waiting for Handshake...");

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      // 1. Handshake
      if (msg.message === "TrueData Real Time Data Service" && msg.success) {
        setStatus("Connected (Ready)");
      }
      
      // 2. Snapshot (Populate List)
      else if (msg.symbollist) {
        console.log("Snapshot:", msg.symbollist);

        msg.symbollist.forEach((item) => {
          // GUARD: Check if item is valid array
          if (!Array.isArray(item)) return;

          const symName = item[0]; 
          const symID = item[1];   
          
          // GUARD: Filter out "Invalid Symbol" errors from server
          if (symName.includes("Invalid")) {
             console.warn("Server reported invalid symbol:", symName);
             return; 
          }
          
          // Map ID to Name immediately
          idToNameMap.current[symID] = symName;

          setMarketData((prev) => ({
            ...prev,
            [symName]: {
              name: symName,
              id: symID,
              ltp: item[3],
              open: item[7],
              high: item[8],
              low: item[9],
              close: item[10]
            }
          }));
        });
      }
          
      else if (msg.trade) {
        // GUARD: Ensure it is a valid trade array (Not text message)
        if (!Array.isArray(msg.trade) || msg.trade.length < 5) return;

        const trade = msg.trade;
        const rawKey = trade[0];

        // CHECK THE MAP: Do we know this ID? 
        const realName = idToNameMap.current[rawKey] || rawKey;

        
        setMarketData((prev) => {
            const oldData = prev[realName];
            
            // Compare Prices
            const newLTP = parseFloat(trade[2]);
            const oldLTP = oldData ? parseFloat(oldData.ltp) : newLTP;
            
            // Decide Row Color
            let newColor = oldData?.color || "white"; 
            
            if (newLTP > oldLTP) {
                newColor = "#a7f2a7ff"; // Green (Up)
            } else if (newLTP < oldLTP) {
                newColor = "#ff6b6bff"; // Red (Down)
            }

            return {
              ...prev,
              [realName]: {
                ...oldData, 
                name: realName,    
                id: rawKey,
                ltp: trade[2],
                color: newColor,
                open: trade[6],
                high: trade[9],
                low: trade[8],
                volume: trade[5]
              }
            };
        });
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  // Actions
  const handleAddSymbol = () => {
    if (!inputText) return;
    const symbolToAdd = inputText.toUpperCase();
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ method: "addsymbol", symbols: [symbolToAdd] }));
    }
    setInputText("");
  };

  const handleRemoveSymbol = (symName, symID) => {
    
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        // Try sending both (some servers prefer Name, some ID)
        const symbolsToRemove = [];
        if (symName) symbolsToRemove.push(symName);
        if (symID) symbolsToRemove.push(symID);
        
        ws.current.send(JSON.stringify({ method: "removesymbol", symbols: symbolsToRemove }));
    }

    // This loops through all rows and keeps only the ones that DO NOT match
    setMarketData((prev) => {
        const newData = {};

        Object.keys(prev).forEach((key) => {
            const row = prev[key];
            
            // Logic: Is this the row we want to delete?
            // Check if Name matches OR if ID matches
            const isMatch = (symName && row.name === symName) || 
                            (symID && row.id === symID);

            if (!isMatch) {
                // If it's NOT a match, keep it.
                newData[key] = row;
            }
        });

        return newData;
    });
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h3>TrueData Dynamic Feed</h3>
      <p>Status: <b style={{color: "green"}}>{status}</b></p>

      <div style={{ marginBottom: "20px" }}>
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
          placeholder="Enter Symbol (e.g. TCS)"
          style={{ padding: "8px" }}
        />
        <button onClick={handleAddSymbol} style={{ padding: "8px 15px", marginLeft:"10px" }}>
         Subscribe
        </button>
      </div>

      <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#333", color: "white" }}>
          <tr>
            <th style={{ padding: "10px" }}>Symbol Name</th>
            <th style={{ padding: "10px" }}>LTP</th>
            <th style={{ padding: "10px" }}>Open</th>
            <th style={{ padding: "10px" }}>High</th>
            <th style={{ padding: "10px" }}>Low</th>
            <th style={{ padding: "10px" }}>Close</th>
            <th style={{ padding: "10px" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(marketData).length === 0 ? (
            <tr><td colSpan="7" style={{textAlign:"center", padding:"20px"}}>No Data</td></tr>
          ) : (
            Object.values(marketData).map((data) => (
              // Use ID or Name as key to be safe
              <tr key={data.id || data.name} style={{ 
                    background: data.color, 
                    transition: "color 0.3s ease" 
                }}>
                <td style={{ fontWeight: "bold", padding: "10px" }}>{data.name}</td>
                <td>{data.ltp}</td>
                <td>{data.open}</td>
                <td >{data.high}</td>
                <td >{data.low}</td>
                <td>{data.close}</td>
                <td style={{ textAlign: "center" }}>
                  <button 
                    // IMPORTANT: Pass BOTH Name and ID to the remove function
                    onClick={() => handleRemoveSymbol(data.name, data.id)}
                    style={{ cursor: "pointer", background: "#f5e7e7ff", padding: "5px 10px" }}
                  >
                    Unsubscribe
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
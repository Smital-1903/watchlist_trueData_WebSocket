import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

export default function TrueDataDynamicTable() {
  const [inputText, setInputText] = useState("");
  const [suggestions, setSuggestions] = useState([]); 
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [marketData, setMarketData] = useState({});
  const [status, setStatus] = useState("Connecting...");
  
  const ws = useRef(null);
  const idToNameMap = useRef({}); 
  const debounceTimeout = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket("wss://push.truedata.in:8082?user=td131&password=smital@131");

    ws.current.onopen = () => setStatus("Connected (Ready)");
    ws.current.onclose = () => setStatus("Disconnected");

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);

    
      if (msg.message === "TrueData Real Time Data Service" && msg.success) {
        setStatus("Connected (Ready)");
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
              name:       item[0],    
              id:         item[1],    
              time:       item[2],   
              ltp:        item[3],    
              ltq:        item[4],    
              atp:        item[5],    
              volume:     item[6],    
              open:       item[7],    
              high:       item[8],    
              low:        item[9],    
              close:      item[10],   
              oi:         item[11],  
              poic:       item[12],   
              turnover:   item[13],   
              bid:        item[14],   
              bidqty:     item[15],   
              ask:        item[16],   
              askqty:     item[17],   
              
              color: "transparent" 
            }
          }));
        });
      } 
      
      // C. LIVE TRADE FEED (Updates)
      else if (msg.trade) {
        if (!Array.isArray(msg.trade) || msg.trade.length < 5) return;
        
        const trade = msg.trade;
        const rawKey = trade[0];
        const realName = idToNameMap.current[rawKey] || rawKey;

        setMarketData((prev) => {
            const oldData = prev[realName];
            
            // Color Logic
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
                
  
                time:       trade[1],
                ltp:        trade[2],
                ltq:        trade[3],
                atp:        trade[4],
                volume:     trade[5],
                open:       trade[6],
                high:       trade[7],
                low:        trade[8],
                close:      trade[9],
                oi:         trade[10],
                poic:       trade[11],
                turnover:   trade[12],
                // trade[13] skipped?
                tick:       trade[14], 
                bid:        trade[15],
                bidqty:     trade[16],
                ask:        trade[17],
                askqty:     trade[18],
                
                color: newColor
              }
            };
        });
      }
    };
    return () => { if (ws.current) ws.current.close(); };
  }, []);


  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
        setSuggestions([]);
        return;
    }

    // Using 'segment=all' so you can find Futures/Options 
    const url = `https://api.truedata.in/getAllSymbols?user=td131&password=smital@131&segment=all&search=${query.toUpperCase()}`;

    try {
        const res = await axios.get(url);
        const allRecords = res.data.Records || [];
        const top10 = allRecords.slice(0, 10);

        const parsedData = top10.map(item => {
            if (Array.isArray(item)) {
                return { id: item[0], symbol: item[1], name: item[2] };
            } else {
                return {
                    id: item.Symbol_ID,
                    symbol: item.Symbol,
                    name: item.Name || item.Description
                };
            }
        });

        setSuggestions(parsedData);
        setShowDropdown(true);

    } catch (err) {
        console.error("Search Error:", err);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const selectSuggestion = (symbol) => {
      setInputText(symbol || "");
      setShowDropdown(false);
  };


  const handleAddSymbol = (symbolOverride) => {
    const sym = (typeof symbolOverride === "string" ? symbolOverride : inputText);
    if (!sym) return;

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ method: "addsymbol", symbols: [sym.toUpperCase()] }));
    }
    setInputText("");
    setShowDropdown(false);
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
      <h3 style={{ marginBottom: "10px" }}>TrueData Dynamic Feed</h3>
      <div style={{ marginBottom: "15px", fontSize: "14px" }}>
        Status: <b style={{color: status.includes("Connected") ? "green" : "red"}}>{status}</b>
      </div>

      {/* DROPDOWN SEARCH */}
      <div style={{ marginBottom: "20px", position: "relative", width: "400px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
            <input 
              type="text" 
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
              placeholder="Search (e.g. NIFTY-I for Futures)"
              style={{ padding: "10px", flex: 1, fontSize:"14px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
            <button 
                onClick={handleAddSymbol} 
                style={{ padding: "10px 20px", background:"#007bff", color:"white", border:"none", borderRadius:"4px", cursor:"pointer" }}>
                Subscribe
            </button>
        </div>

        {showDropdown && suggestions.length > 0 && (
            <ul style={{
                position: "absolute", top: "100%", left: 0, width: "100%",
                background: "white", border: "1px solid #ccc",
                listStyle: "none", padding: 0, margin: 0,
                zIndex: 9999, maxHeight: "300px", overflowY: "auto",
                boxShadow: "0px 4px 8px rgba(0,0,0,0.2)"
            }}>
                {suggestions.map((item, idx) => (
                    <li 
                        key={idx} 
                        onClick={() => selectSuggestion(item.symbol)}
                        style={{ 
                            padding: "10px", cursor: "pointer", 
                            borderBottom: "1px solid #eee", fontSize: "13px", color: "black"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f0f0f0"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                    >
                        <div style={{fontWeight:"bold"}}>{item.symbol}</div>
                        <div style={{fontSize:"11px", color:"#666"}}>{item.name}</div>
                    </li>
                ))}
            </ul>
        )}
      </div>

      {/* DATA TABLE */}
      <div style={{ overflowX: "auto", border: "1px solid #ddd", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize:"13px", minWidth:"1400px", fontFamily: "monospace" }}>
          <thead style={{ background: "#333", color: "white", textAlign: "left" }}>
            <tr>
              <th style={thStyle}>Symbol</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>LTP</th>
              <th style={thStyle}>LTQ</th>
              <th style={thStyle}>ATP</th>
              <th style={thStyle}>Vol</th>
              <th style={thStyle}>Open</th>
              <th style={thStyle}>High</th>
              <th style={thStyle}>Low</th>
              <th style={thStyle}>Close</th>
              <th style={thStyle}>OI</th>
              <th style={thStyle}>Prev OI</th>
              <th style={thStyle}>Turnover</th>
              <th style={thStyle}>Bid (Qty)</th>
              <th style={thStyle}>Ask (Qty)</th>
              <th style={{...thStyle, textAlign: "center"}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(marketData).length === 0 ? (
              <tr><td colSpan="16" style={{textAlign:"center", padding:"30px", color:"#666"}}>No Symbols Subscribed</td></tr>
            ) : (
              Object.values(marketData).map((data) => (
                <tr key={data.id || data.name} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ ...tdStyle, fontWeight: "bold" }}>{data.name}</td>
                  <td style={tdStyle}>{data.time ? new Date(data.time).toLocaleTimeString() : "-"}</td>
                  
                  <td style={{ 
                      ...tdStyle, 
                      fontWeight: "bold",
                      background: data.color, 
                      transition: "background 0.5s ease" 
                  }}>
                      {data.ltp}
                  </td>

                  <td style={tdStyle}>{data.ltq}</td>
                  <td style={tdStyle}>{data.atp}</td>
                  <td style={tdStyle}>{data.volume}</td>
                  <td style={tdStyle}>{data.open}</td>
                  <td style={{ ...tdStyle, color:"green" }}>{data.high}</td>
                  <td style={{ ...tdStyle, color:"red" }}>{data.low}</td>
                  <td style={tdStyle}>{data.close}</td>
                  <td style={tdStyle}>{data.oi}</td>
                  <td style={tdStyle}>{data.poic}</td>
                  <td style={tdStyle}>{data.turnover}</td>
                  
                  <td style={{ ...tdStyle, color: "blue" }}>{data.bid} ({data.bidqty})</td>
                  <td style={{ ...tdStyle, color: "red" }}>{data.ask} ({data.askqty})</td>
                  
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <button 
                        onClick={() => handleRemoveSymbol(data.name, data.id)} 
                        style={{ cursor: "pointer", background: "#ff4d4d", color: "white", border: "none", padding: "5px 10px", borderRadius: "3px" }}
                    >
                        Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = { padding: "10px", whiteSpace: "nowrap" };
const tdStyle = { padding: "8px", whiteSpace: "nowrap" };
import React from "react";

export default function WatchlistDisplay({ marketData, onRemove }) {
  
  const thStyle = { padding: "10px", whiteSpace: "nowrap" };
  const tdStyle = { padding: "8px", whiteSpace: "nowrap" };

  return (
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
              <tr>
                <td colSpan="16" style={{textAlign:"center", padding:"30px", color:"#666"}}>
                    No Symbols Subscribed
                </td>
              </tr>
            ) : (
              Object.values(marketData).map((data) => (
                <tr key={data.id || data.name} style={{ textAlign:"right", borderBottom: "1px solid #eee" }}>
                  <td style={{ ...tdStyle, fontWeight: "bold" }}>{data.name}</td>
                  <td style={{tdStyle,textAlign: "center"}}>{data.time}</td>
                  <td style={{ ...tdStyle, fontWeight: "bold", background: data.color, transition: "background 0.5s ease",textAlign:"left",minWidth:"90px" }}>{data.ltp}</td>
                  <td style={{tdStyle,textAlign:"left"}}>{data.ltq}</td>
                  <td style={{tdStyle,textAlign:"left"}}>{data.atp}</td>
                  <td style={{tdStyle,textAlign:"left"}}>{data.volume}</td>
                  <td style={{tdStyle,textAlign:"left"}}>{data.open}</td>
                  <td style={{ ...tdStyle, color:"green",textAlign:"left" }}>{data.high}</td>
                  <td style={{ ...tdStyle, color:"red",textAlign:"left" }}>{data.low}</td>
                  <td style={{tdStyle,textAlign:"left"}}>{data.close}</td>
                  <td style={{tdStyle,textAlign:"left"}}>{data.oi}</td>
                  <td style={{tdStyle,textAlign:"left"}}>{data.poic}</td>
                  <td style={{tdStyle,textAlign:"left"}}>{data.turnover}</td>
                  <td style={{ ...tdStyle, color: "blue",textAlign:"left" }}>{data.bid} ({data.bidqty})</td>
                  <td style={{ ...tdStyle, color: "red" ,textAlign:"left"}}>{data.ask} ({data.askqty})</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <button 
                        onClick={() => onRemove(data.name, data.id)} 
                        style={{ cursor: "pointer", background: "#ff4d4d", color: "white", border: "none", padding: "5px 10px", borderRadius: "3px" }}
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
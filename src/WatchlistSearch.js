import React, { useState, useRef } from "react";
import axios from "axios";

export default function WatchlistSearch({ status, onSubscribe, onLogin, credentials ,onLogout}) {
  const [userInput, setUserInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [inputText, setInputText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimeout = useRef(null);

  const handleConnectClick = () => {
    onLogin(userInput, passInput);
  };
  const handleDisConnectClick =()=>{
    onLogout();
    setInputText("");
    setPassInput("");
    setUserInput("");
  }


  const fetchSuggestions = async (query) => {
    if (!query) return;
    if (!credentials) return; 

    const { user, pass } = credentials;
    const url = `https://api.truedata.in/getAllSymbols?user=${user}&password=${pass}&segment=all&search=${query.toUpperCase()}`;

    try {
        const res = await axios.get(url);
        const allRecords = res.data.Records || [];
        const top10 = allRecords.slice(0, 10);

        const parsedData = top10.map(item => {
            if (Array.isArray(item)) {
                return { id: item[0], symbol: item[1] };
            } else {
                return { id: item.Symbol_ID, symbol: item.Symbol};
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
      onSubscribe(symbol); 
      setInputText("");
      setShowDropdown(false);
  };
  const handleManualSubscribe = () => {
    if (inputText) {
        onSubscribe(inputText);
        setInputText("");
        setShowDropdown(false);
    }
  };

  return (
    <div style={{ marginBottom: "20px", borderBottom: "1px solid #ddd", paddingBottom: "15px" }}>
      <h3 style={{ marginBottom: "10px",textAlign:"center" }}>TrueData Live Watchlist</h3>
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "center" }}>
          <input 
            type="text" placeholder="User ID" 
            value={userInput} onChange={(e) => setUserInput(e.target.value)}
            style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
          />
          <input 
            type="password" placeholder="Password" 
            value={passInput} onChange={(e) => setPassInput(e.target.value)}
            style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
          />
          <button 
            onClick={handleConnectClick}
            style={{ padding: "8px 15px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Connect
          </button>
           <button 
            onClick={handleDisConnectClick}
            style={{ padding: "8px 15px", background: "#d13216ff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", textAlign:"right"}}>
            Disconnect
          </button>
          
          <b style={{ marginLeft: "10px", color: status.includes("Connected") ? "green" : "red" }}>
            {status}
          </b>
      </div>
      <div style={{ position: "relative", width: "400px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
            <input 
              type="text" 
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubscribe()}
              placeholder={credentials ? "Search Symbol (e.g. NIFTY)" : "Please Connect first..."}
              style={{ padding: "10px", flex: 1, fontSize:"14px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
            <button 
                onClick={handleManualSubscribe} 
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
                    <li key={idx} onClick={() => selectSuggestion(item.symbol)} style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #eee", fontSize: "13px", color: "black" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f0f0f0"} onMouseLeave={(e) => e.currentTarget.style.background = "white"}>
                        <div style={{fontWeight:"bold"}}>{item.symbol}</div>
                        <div style={{fontSize:"11px", color:"#666"}}>{item.name}</div>
                    </li>
                ))}
            </ul>
        )}
       
      </div>
    </div>
  );
}
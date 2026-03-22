import { useState, useEffect } from 'react';
import { getInvestmentSummary } from './lib/groq';
import { fetchLatestMarketNews, searchStockSymbol, searchSIP } from './lib/news';
import { supabase } from './lib/supabase';
import Auth from './Auth';

function App() {
    const [session, setSession] = useState(null);
    const [aiSummary, setAiSummary] = useState("Click 'Refresh AI Summary' to analyze your portfolio's future.");
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Removed ipos from the portfolio state
    const [portfolio, setPortfolio] = useState({ stocks: [], sips: [] });

    // Search states for Stocks and SIPs
    const [stockQuery, setStockQuery] = useState('');
    const [stockResults, setStockResults] = useState([]);
    const [isSearchingStock, setIsSearchingStock] = useState(false);

    const [sipQuery, setSipQuery] = useState('');
    const [sipResults, setSipResults] = useState([]);
    const [isSearchingSIP, setIsSearchingSIP] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    }, []);

    const fetchPortfolio = async () => {
        if (!session) return;
        const { data, error } = await supabase.from('user_assets').select('*').order('created_at', { ascending: true });
        if (!error && data) {
            setPortfolio({
                // Only mapping Stocks and SIPs now
                stocks: data.filter(item => item.asset_type === 'Stock').map(item => ({ id: item.id, name: item.asset_name })),
                sips: data.filter(item => item.asset_type === 'SIP').map(item => ({ id: item.id, name: item.asset_name }))
            });
        }
    };

    useEffect(() => { fetchPortfolio(); }, [session]);

    const handleSearchTyping = async (e, type) => {
        const query = e.target.value;

        if (type === 'Stock') {
            setStockQuery(query);
            if (query.length >= 2) {
                setIsSearchingStock(true);
                setStockResults(await searchStockSymbol(query));
                setIsSearchingStock(false);
            } else setStockResults([]);
        }
        else if (type === 'SIP') {
            setSipQuery(query);
            if (query.length >= 3) {
                setIsSearchingSIP(true);
                setSipResults(await searchSIP(query));
                setIsSearchingSIP(false);
            } else setSipResults([]);
        }
    };

    const handleAddAsset = async (assetType, assetName) => {
        if (portfolio[assetType.toLowerCase() + 's'].some(item => item.name === assetName)) {
            alert(`You already added ${assetName}!`);
            return;
        }

        const { error } = await supabase.from('user_assets').insert([
            { user_id: session.user.id, asset_type: assetType, asset_name: assetName }
        ]);

        if (!error) {
            fetchPortfolio();
            if (assetType === 'Stock') { setStockQuery(''); setStockResults([]); }
            if (assetType === 'SIP') { setSipQuery(''); setSipResults([]); }
        }
    };

    const handleDeleteAsset = async (id) => {
        await supabase.from('user_assets').delete().eq('id', id);
        fetchPortfolio();
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setAiSummary("Fetching live market news from Finnhub...");

        const liveNews = await fetchLatestMarketNews();
        if (liveNews === "Error retrieving live news.") {
            setAiSummary("Failed to fetch news.");
            setIsRefreshing(false);
            return;
        }

        setAiSummary("Analyzing your specific portfolio with Groq AI...");

        // --- NEW: Format the user's portfolio into a string ---
        // We map through the arrays to grab just the 'name' of each asset, and join them with commas.
        const stockNames = portfolio.stocks.length > 0 ? portfolio.stocks.map(s => s.name).join(', ') : 'None';
        const sipNames = portfolio.sips.length > 0 ? portfolio.sips.map(s => s.name).join(', ') : 'None';

        const myPortfolio = `Stocks: ${stockNames} | SIPs (Mutual Funds): ${sipNames}`;

        // --- UPDATED: Pass the custom portfolio string instead of "General Financial Market" ---
        const summary = await getInvestmentSummary(liveNews, myPortfolio);

        setAiSummary(summary);
        setIsRefreshing(false);
    };

    if (!session) return <Auth />;

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>

            {/* Header Widget */}
            <div style={{ backgroundColor: '#1e1e24', padding: '20px', borderRadius: '10px', marginBottom: '30px', border: '1px solid #333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>🤖 AI Portfolio Outlook</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleRefresh} disabled={isRefreshing} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
                            {isRefreshing ? "Analyzing..." : "Refresh AI Summary"}
                        </button>
                        <button onClick={() => supabase.auth.signOut()} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px' }}>
                            Sign Out
                        </button>
                    </div>
                </div>
                <p style={{ whiteSpace: 'pre-line', marginTop: '15px', lineHeight: '1.6', color: '#ccc' }}>{aiSummary}</p>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>

                {/* STOCKS */}
                <div style={{ flex: 1, border: '1px solid #333', padding: '15px', borderRadius: '8px', backgroundColor: '#1e1e24' }}>
                    <h3>📈 Stocks</h3>
                    <div style={{ position: 'relative' }}>
                        <input type="text" placeholder="Search stock symbol..." value={stockQuery} onChange={(e) => handleSearchTyping(e, 'Stock')} style={{ width: '100%', padding: '8px', marginBottom: '15px', backgroundColor: '#333', color: 'white', border: '1px solid #555', boxSizing: 'border-box' }}/>
                        {isSearchingStock && <div style={{ fontSize: '12px', color: '#aaa', marginTop: '-10px', marginBottom: '10px' }}>Searching Finnhub...</div>}
                        {stockResults.length > 0 && (
                            <ul style={{ position: 'absolute', top: '40px', left: 0, right: 0, backgroundColor: '#2b2b36', border: '1px solid #555', padding: 0, listStyle: 'none', zIndex: 10 }}>
                                {stockResults.map((result) => (
                                    <li key={result.symbol} onClick={() => handleAddAsset('Stock', result.description)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #444' }}>
                                        <strong>{result.symbol}</strong> - {result.description}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                        {portfolio.stocks.map((item) => (
                            <li key={item.id} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                {item.name} <button onClick={() => handleDeleteAsset(item.id)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}>❌</button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* SIPS */}
                <div style={{ flex: 1, border: '1px solid #333', padding: '15px', borderRadius: '8px', backgroundColor: '#1e1e24' }}>
                    <h3>💰 SIPs</h3>
                    <div style={{ position: 'relative' }}>
                        <input type="text" placeholder="Search mutual funds..." value={sipQuery} onChange={(e) => handleSearchTyping(e, 'SIP')} style={{ width: '100%', padding: '8px', marginBottom: '15px', backgroundColor: '#333', color: 'white', border: '1px solid #555', boxSizing: 'border-box' }}/>
                        {isSearchingSIP && <div style={{ fontSize: '12px', color: '#aaa', marginTop: '-10px', marginBottom: '10px' }}>Searching API...</div>}
                        {sipResults.length > 0 && (
                            <ul style={{ position: 'absolute', top: '40px', left: 0, right: 0, backgroundColor: '#2b2b36', border: '1px solid #555', padding: 0, listStyle: 'none', zIndex: 10 }}>
                                {sipResults.map((result) => (
                                    <li key={result.schemeCode} onClick={() => handleAddAsset('SIP', result.schemeName)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #444' }}>
                                        {result.schemeName}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                        {portfolio.sips.map((item) => (
                            <li key={item.id} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                {item.name} <button onClick={() => handleDeleteAsset(item.id)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}>❌</button>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </div>
    );
}

export default App;
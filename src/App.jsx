import { useState, useEffect } from 'react';
import { getInvestmentSummary, getSmartAnalysis } from './lib/groq'; // Updated import
import { fetchLatestMarketNews, searchStockSymbol, searchSIP, fetchNewsList } from './lib/news'; // Updated import
import { supabase } from './lib/supabase';
import Auth from './Auth';

function App() {
    const [session, setSession] = useState(null);

    // --- NEW: Tab Navigation State ---
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'stocksNews', 'sipsNews'

    // Dashboard AI State
    const [aiSummary, setAiSummary] = useState("Click 'Refresh AI Summary' to analyze your portfolio's future.");
    const [isRefreshing, setIsRefreshing] = useState(false);

    // News View State
    const [newsArticles, setNewsArticles] = useState([]);
    const [smartAnalysis, setSmartAnalysis] = useState("");
    const [isLoadingNews, setIsLoadingNews] = useState(false);

    const [portfolio, setPortfolio] = useState({ stocks: [], sips: [] });

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
                stocks: data.filter(item => item.asset_type === 'Stock').map(item => ({ id: item.id, name: item.asset_name })),
                sips: data.filter(item => item.asset_type === 'SIP').map(item => ({ id: item.id, name: item.asset_name }))
            });
        }
    };

    useEffect(() => { fetchPortfolio(); }, [session]);

    // --- NEW: Function to load News and generate Smart Move when you switch tabs ---
    const loadNewsTab = async (categoryStr) => {
        setIsLoadingNews(true);
        setSmartAnalysis("Reading 10 live articles and calculating your next smart move...");

        // 1. Fetch exactly 10 articles
        const articles = await fetchNewsList();
        setNewsArticles(articles);

        // 2. Decide which portfolio items to send to the AI
        const items = categoryStr === 'Stocks'
            ? portfolio.stocks.map(s => s.name)
            : portfolio.sips.map(s => s.name);

        // 3. Get the specialized Smart Analysis
        const analysis = await getSmartAnalysis(articles, items, categoryStr);
        setSmartAnalysis(analysis);

        setIsLoadingNews(false);
    };

    // Handle Tab Switching
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        if (tabName === 'stocksNews') loadNewsTab('Stocks');
        if (tabName === 'sipsNews') loadNewsTab('SIPs');
    };

    // ... [Keep your existing handleSearchTyping, handleAddAsset, handleDeleteAsset, and handleRefresh here] ...
    const handleSearchTyping = async (e, type) => {
        const query = e.target.value;
        if (type === 'Stock') {
            setStockQuery(query);
            if (query.length >= 2) {
                setIsSearchingStock(true);
                setStockResults(await searchStockSymbol(query));
                setIsSearchingStock(false);
            } else setStockResults([]);
        } else if (type === 'SIP') {
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
            alert(`You already added ${assetName}!`); return;
        }
        const { error } = await supabase.from('user_assets').insert([{ user_id: session.user.id, asset_type: assetType, asset_name: assetName }]);
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
            setAiSummary("Failed to fetch news."); setIsRefreshing(false); return;
        }
        setAiSummary("Analyzing your specific portfolio with Groq AI...");
        const stockNames = portfolio.stocks.length > 0 ? portfolio.stocks.map(s => s.name).join(', ') : 'None';
        const sipNames = portfolio.sips.length > 0 ? portfolio.sips.map(s => s.name).join(', ') : 'None';
        const myPortfolio = `Stocks: ${stockNames} | SIPs (Mutual Funds): ${sipNames}`;
        const summary = await getInvestmentSummary(liveNews, myPortfolio);
        setAiSummary(summary);
        setIsRefreshing(false);
    };


    if (!session) return <Auth />;

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>

            {/* Top Navigation Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
                <h2>FinanceAI</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleTabChange('dashboard')} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: activeTab === 'dashboard' ? '#007bff' : '#333', color: 'white', border: 'none', borderRadius: '5px' }}>Dashboard</button>
                    <button onClick={() => handleTabChange('stocksNews')} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: activeTab === 'stocksNews' ? '#007bff' : '#333', color: 'white', border: 'none', borderRadius: '5px' }}>Stock Strategy</button>
                    <button onClick={() => handleTabChange('sipsNews')} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: activeTab === 'sipsNews' ? '#007bff' : '#333', color: 'white', border: 'none', borderRadius: '5px' }}>SIP Strategy</button>
                    <button onClick={() => supabase.auth.signOut()} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', marginLeft: '20px' }}>Sign Out</button>
                </div>
            </div>

            {/* --- DASHBOARD VIEW --- */}
            {activeTab === 'dashboard' && (
                <>
                    <div style={{ backgroundColor: '#1e1e24', padding: '20px', borderRadius: '10px', marginBottom: '30px', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2>🤖 General Portfolio Outlook</h2>
                            <button onClick={handleRefresh} disabled={isRefreshing} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
                                {isRefreshing ? "Analyzing..." : "Refresh AI Summary"}
                            </button>
                        </div>
                        <p style={{ whiteSpace: 'pre-line', marginTop: '15px', lineHeight: '1.6', color: '#ccc' }}>{aiSummary}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '20px' }}>
                        {/* STOCKS COLUMN */}
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

                        {/* SIPS COLUMN */}
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
                </>
            )}

            {/* --- NEWS & STRATEGY VIEW --- */}
            {(activeTab === 'stocksNews' || activeTab === 'sipsNews') && (
                <div style={{ display: 'flex', gap: '30px' }}>

                    {/* Left Side: The Top 10 News Articles */}
                    <div style={{ flex: 1 }}>
                        <h3>📰 Top 10 Latest Articles</h3>
                        {isLoadingNews ? <p>Loading articles...</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {newsArticles.map((article, index) => (
                                    <a key={index} href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <div style={{ backgroundColor: '#1e1e24', padding: '15px', borderRadius: '8px', border: '1px solid #333', transition: '0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.borderColor = '#007bff'} onMouseOut={e => e.currentTarget.style.borderColor = '#333'}>
                                            <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>{article.headline}</h4>
                                            <p style={{ margin: 0, fontSize: '14px', color: '#aaa' }}>{article.summary.substring(0, 150)}...</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Side: AI Smart Move Analysis */}
                    <div style={{ flex: 1 }}>
                        <div style={{ position: 'sticky', top: '20px', backgroundColor: '#1e1e24', padding: '25px', borderRadius: '10px', border: '1px solid #007bff', boxShadow: '0 0 15px rgba(0, 123, 255, 0.2)' }}>
                            <h2 style={{ margin: '0 0 20px 0', color: '#fff' }}>🧠 AI Strategy & Smart Move</h2>
                            <div style={{ color: '#ccc', lineHeight: '1.8', whiteSpace: 'pre-line', fontSize: '16px' }}>
                                {smartAnalysis}
                            </div>
                        </div>
                    </div>

                </div>
            )}

        </div>
    );
}

export default App;
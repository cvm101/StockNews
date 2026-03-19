import { useState, useEffect } from 'react';
import { getInvestmentSummary } from './lib/groq';
import { fetchLatestMarketNews } from './lib/news';
import { supabase } from './lib/supabase';
import Auth from './Auth';

function App() {
    const [session, setSession] = useState(null);
    const [aiSummary, setAiSummary] = useState("Click 'Refresh AI Summary' to analyze your portfolio's future.");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [portfolio, setPortfolio] = useState({ stocks: [], ipos: [], sips: [] });

    const availableStocks = ['Tata Motors', 'Reliance', 'HDFC Bank', 'Infosys', 'Wipro'];
    const availableIPOs = ['Upcoming Tech IPO', 'Green Energy IPO', 'Pharma IPO'];
    const availableSIPs = ['SBI Small Cap Fund', 'Parag Parikh Flexi Cap', 'Axis Bluechip'];

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    }, []);

    // --- UPDATED: Fetch Portfolio (Now saves the ID too!) ---
    const fetchPortfolio = async () => {
        if (!session) return;

        const { data, error } = await supabase
            .from('user_assets')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching portfolio:", error);
        } else if (data) {
            // Notice we are saving an object { id, name } now instead of just the name
            setPortfolio({
                stocks: data.filter(item => item.asset_type === 'Stock').map(item => ({ id: item.id, name: item.asset_name })),
                ipos: data.filter(item => item.asset_type === 'IPO').map(item => ({ id: item.id, name: item.asset_name })),
                sips: data.filter(item => item.asset_type === 'SIP').map(item => ({ id: item.id, name: item.asset_name }))
            });
        }
    };

    useEffect(() => {
        fetchPortfolio();
    }, [session]);

    const handleAddAsset = async (assetType, event) => {
        const assetName = event.target.value;
        if (assetName.startsWith('+')) return;

        // Check if it already exists (updated to check item.name)
        if (portfolio[assetType.toLowerCase() + 's'].some(item => item.name === assetName)) {
            alert(`You already added ${assetName}!`);
            return;
        }

        const { error } = await supabase.from('user_assets').insert([
            { user_id: session.user.id, asset_type: assetType, asset_name: assetName }
        ]);

        if (error) {
            alert("Failed to save asset.");
        } else {
            fetchPortfolio();
        }
    };

    // --- NEW: Delete Asset Function ---
    const handleDeleteAsset = async (id) => {
        const { error } = await supabase
            .from('user_assets')
            .delete()
            .eq('id', id); // Match the unique ID to delete

        if (error) {
            console.error("Error deleting asset:", error);
            alert("Could not delete the item.");
        } else {
            // Refresh the screen to remove the item visually
            fetchPortfolio();
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setAiSummary("Fetching live market news from Finnhub...");
        const liveNews = await fetchLatestMarketNews();
        if (liveNews === "Error retrieving live news.") {
            setAiSummary("Sorry, there was an issue fetching the news. Please check your API key.");
            setIsRefreshing(false);
            return;
        }
        setAiSummary("Reading 10 articles and analyzing with Groq AI...");
        const summary = await getInvestmentSummary(liveNews, "General Financial Market");
        setAiSummary(summary);
        setIsRefreshing(false);
    };

    if (!session) return <Auth />;

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>

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
                <p style={{ whiteSpace: 'pre-line', marginTop: '15px', lineHeight: '1.6', color: '#ccc' }}>
                    {aiSummary}
                </p>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>

                {/* STOCKS */}
                <div style={{ flex: 1, border: '1px solid #333', padding: '15px', borderRadius: '8px', backgroundColor: '#1e1e24' }}>
                    <h3>📈 Stocks</h3>
                    <select onChange={(e) => handleAddAsset('Stock', e)} style={{ width: '100%', padding: '8px', marginBottom: '15px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}>
                        <option>+ Add a Stock</option>
                        {availableStocks.map(stock => <option key={stock} value={stock}>{stock}</option>)}
                    </select>
                    <ul style={{ paddingLeft: '20px' }}>
                        {/* UPDATED: Added the delete button here */}
                        {portfolio.stocks.map((item) => (
                            <li key={item.id} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                {item.name}
                                <button onClick={() => handleDeleteAsset(item.id)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}>❌</button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* IPOS */}
                <div style={{ flex: 1, border: '1px solid #333', padding: '15px', borderRadius: '8px', backgroundColor: '#1e1e24' }}>
                    <h3>🚀 IPOs</h3>
                    <select onChange={(e) => handleAddAsset('IPO', e)} style={{ width: '100%', padding: '8px', marginBottom: '15px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}>
                        <option>+ Add an IPO</option>
                        {availableIPOs.map(ipo => <option key={ipo} value={ipo}>{ipo}</option>)}
                    </select>
                    <ul style={{ paddingLeft: '20px' }}>
                        {/* UPDATED: Added the delete button here */}
                        {portfolio.ipos.map((item) => (
                            <li key={item.id} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                {item.name}
                                <button onClick={() => handleDeleteAsset(item.id)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}>❌</button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* SIPS */}
                <div style={{ flex: 1, border: '1px solid #333', padding: '15px', borderRadius: '8px', backgroundColor: '#1e1e24' }}>
                    <h3>💰 SIPs</h3>
                    <select onChange={(e) => handleAddAsset('SIP', e)} style={{ width: '100%', padding: '8px', marginBottom: '15px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}>
                        <option>+ Add a SIP</option>
                        {availableSIPs.map(sip => <option key={sip} value={sip}>{sip}</option>)}
                    </select>
                    <ul style={{ paddingLeft: '20px' }}>
                        {/* UPDATED: Added the delete button here */}
                        {portfolio.sips.map((item) => (
                            <li key={item.id} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                {item.name}
                                <button onClick={() => handleDeleteAsset(item.id)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}>❌</button>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </div>
    );
}

export default App;
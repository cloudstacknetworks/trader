
# News Trader - User Manual

**CloudStack Networks Trading Platform**  
Version 1.0 | Last Updated: November 18, 2025

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Market Search & Stock Discovery](#market-search--stock-discovery)
4. [Screening Strategies](#screening-strategies)
5. [Earnings Calendar & Monitoring](#earnings-calendar--monitoring)
6. [Paper Trading Lab](#paper-trading-lab)
7. [Backtesting](#backtesting)
8. [Watchlist Management](#watchlist-management)
9. [Positions & Trades](#positions--trades)
10. [Settings & Configuration](#settings--configuration)
11. [Common Workflows](#common-workflows)
12. [Tips & Best Practices](#tips--best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Login
1. Navigate to: https://trader.cloudstacknetworks.com
2. Enter your email and password
3. Click **Sign In**

### First Time Setup
After logging in for the first time, you should:

1. **Configure Alpaca API Keys** (Dashboard → Settings)
   - Get your API keys from https://alpaca.markets
   - Use Paper Trading keys for testing
   - Click "Test Connection" to verify

2. **Verify Account Settings** (Dashboard → Settings)
   - Starting Capital: Default $100,000
   - Max Positions: Default 10
   - Trailing Stop: Default 15%
   - Paper Trading: Enabled by default

---

## Dashboard Overview

The main dashboard provides a quick snapshot of your trading activity:

### Key Metrics
- **Account Value**: Total portfolio value
- **Cash Balance**: Available cash for new positions
- **Total P&L**: Profit/Loss ($ and %)
- **Open Positions**: Number of active trades

### Performance Chart
- Visual representation of portfolio value over time
- Hover over points to see specific values

### Quick Views
- **Open Positions**: Your current holdings
- **Watchlist Preview**: Top-rated stocks
- **Recent Trades**: Latest completed trades

---

## Market Search & Stock Discovery

**Location:** Dashboard → Market

### Searching for Stocks

1. **Basic Search**
   - Type ticker symbol (e.g., "AAPL") or company name (e.g., "Apple")
   - Press Enter or click Search
   - Results show up to 20 stocks

2. **Filter by Exchange**
   - Click the Exchange dropdown
   - Select: NASDAQ, NYSE, AMEX, or "All Exchanges"
   - Useful for focusing on major exchanges

### Stock Details

Click any stock to view comprehensive information:

#### Company Information
- Company Name & Industry
- Country & Exchange
- Market Capitalization

#### Price Overview
- Current Price
- Previous Close
- 24h Change ($ and %)
- Volume
- 52-Week High/Low

#### Valuation Metrics
- P/E Ratio (Price-to-Earnings)
- P/S Ratio (Price-to-Sales)
- P/B Ratio (Price-to-Book)
- P/CF Ratio (Price-to-Cash-Flow)

#### Financial Health
- ROE (Return on Equity)
- Debt-to-Equity Ratio
- Current Ratio

#### Growth & Income
- Revenue Growth
- Earnings Growth
- Dividend Yield

#### Momentum & Technicals
- 3-Month Momentum
- 6-Month Price Trend Chart

### Example: Finding Quality Tech Stocks

**Goal:** Find profitable tech companies with reasonable valuations

1. Go to **Market**
2. Filter by **NASDAQ** exchange
3. Search "Technology" or browse results
4. Click stocks to view details
5. Look for:
   - P/E < 25 (reasonable valuation)
   - ROE > 15% (profitability)
   - Positive momentum
6. Add promising stocks to watchlist

---

## Screening Strategies

**Location:** Dashboard → Screens

Screens are automated filters that identify stocks matching specific criteria.

### Types of Screens

#### 1. O'Shaughnessy Screens (Traditional Value)
Focus on fundamental quality metrics:
- Valuation (P/E, P/S, P/B ratios)
- Financial Health (ROE, Debt)
- Growth (Revenue, Earnings)
- Market metrics (Market Cap, Volume)

#### 2. Earnings Screens (Event-Driven)
Focus on stocks with upcoming earnings that beat expectations:
- Pre-filtered by quality criteria
- Monitors specific stocks
- Trades only on earnings beats

### Creating a New O'Shaughnessy Screen

**Example: Small Cap Value Screen**

1. Click **"+ Create New Screen"**
2. **Name:** "Small Cap Value"
3. **Description:** "Undervalued small caps with solid fundamentals"
4. **Screen Type:** O'Shaughnessy
5. Set criteria:

   **Valuation:**
   - Min P/E: 5
   - Max P/E: 15
   - Max P/S: 2

   **Financial Health:**
   - Min ROE: 10%
   - Max Debt-to-Equity: 1.0

   **Market:**
   - Min Market Cap: $50M
   - Max Market Cap: $2B
   - Min Volume: 100,000

6. Click **"Create Screen"**
7. Click **"Run Screen Now"** to populate results

### Editing & Managing Screens

- **Edit:** Click pencil icon to modify criteria
- **Clone:** Copy screen to create variations
- **Delete:** Remove screens (only if no watchlist items)
- **Run Manually:** Click play icon to refresh results

---

## Earnings Calendar & Monitoring

**Location:** Dashboard → Earnings Calendar

This feature allows you to trade stocks based on earnings beats.

### Understanding the Earnings Calendar

The calendar shows upcoming earnings reports for the next 30 days:

- **Date:** When earnings will be reported
- **Symbol:** Stock ticker
- **Quarter:** Fiscal quarter (e.g., Q3 2025)
- **Estimated EPS:** Analyst consensus
- **Actual EPS:** Reported earnings (after announcement)
- **Surprise %:** How much actual beat/missed estimates

### Workflow: Creating an Earnings Monitor

**Example: Monitoring Quality Retailers for Earnings Beats**

#### Step 1: Filter the Calendar

1. Go to **Earnings Calendar**
2. Click **"Show Filters"** button
3. Set quality criteria:

   ```
   Valuation:
   - Max P/E: 15
   
   Financial Health:
   - Min ROE: 15%
   - Max Debt-to-Equity: 0.5
   
   Market:
   - Min Market Cap: $5B (large caps only)
   ```

4. Click **"Apply Filters"**
5. **Result:** See 52 stocks reporting earnings that meet your criteria

#### Step 2: Select Specific Stocks

1. Review the filtered list
2. **Manual Curation:** Check boxes next to stocks you like
   - Example: Check TGT, WMT, COST, LOW, HD (retail stocks)
   - Skip stocks you don't trust (even if they match filters)

3. Use **"Select All"** or **"Clear Selection"** for bulk actions
4. **Status:** Shows "5 of 52 selected"

#### Step 3: Create the Earnings Monitor

1. Click **"Create Earnings Monitor (5 stocks)"**
2. Dialog opens:
   - **Monitor Name:** "Quality Retail Earnings"
   - **Min Earnings Surprise:** 5% (only trade if they beat by 5%+)
3. Review: "This will monitor 5 specific stocks: TGT, WMT, COST, LOW, HD"
4. Click **"Create Monitor"**

#### Step 4: Paper Trade It

1. Go to **Paper Trading Lab**
2. Click **"Create New Run"**
3. Configure:
   - **Run Name:** "Retail Earnings Test"
   - **Screen:** Select "Quality Retail Earnings"
   - **Run Type:** Live
   - **Starting Capital:** $100,000
   - **Max Positions:** 5
4. Click **"Start Run"**

### What Happens Automatically

The system monitors your selected stocks:

```
Nov 20: TGT reports, beats by 7.2%
  → Automatic BUY (meets 5% threshold) ✅

Nov 21: MSFT reports, beats by 9%
  → SKIPPED (not in your monitored list) ❌

Nov 22: WMT reports, beats by 3%
  → SKIPPED (below 5% threshold) ❌

Nov 23: COST reports, beats by 8.5%
  → Automatic BUY (meets threshold) ✅
```

### Filtering Options Explained

#### Apply Existing Screen (Future Feature)
- Dropdown showing all saved screens
- Apply O'Shaughnessy criteria to earnings calendar
- Quick way to reuse proven filters

#### Custom Filters (Current)
- Ad-hoc filtering without saving
- Experiment with different criteria
- Option to "Save as Screen" if you like results

---

## Paper Trading Lab

**Location:** Dashboard → Paper Trading

Test trading strategies with historical or real-time data without risking real money.

### Creating a Paper Trading Run

**Example: Testing a Large Cap Value Strategy**

#### Step 1: Create or Select a Screen
1. Go to **Screens**
2. Use existing screen or create new one
3. Example: "Large Cap Value"

#### Step 2: Configure the Run

1. Go to **Paper Trading Lab**
2. Click **"Create New Run"**
3. Fill in details:

   ```
   Run Name: "Large Cap Q4 2025"
   Screen: "Large Cap Value"
   Run Type: Historical (for immediate results)
   Start Date: Oct 1, 2025
   End Date: Nov 18, 2025
   Starting Capital: $100,000
   Max Positions: 10
   Trailing Stop: 15%
   ```

4. Click **"Start Run"**

#### Step 3: View Results

After run completes (instant for historical):

**Performance Metrics:**
- Total Return: $8,450 (8.45%)
- Win Rate: 65%
- Sharpe Ratio: 1.8
- Max Drawdown: -5.2%
- Profit Factor: 2.1
- Avg Hold Time: 12 days

**Trade History:**
| Symbol | Entry | Exit | Days | P&L | Reason |
|--------|-------|------|------|-----|--------|
| AAPL | $150 | $162 | 14 | +$1,200 | Trailing Stop |
| TGT | $120 | $115 | 8 | -$500 | Stop Loss |
| WMT | $145 | $155 | 18 | +$2,100 | Trailing Stop |

### Run Types

#### Historical Backtest
- Tests strategy on past data
- Completes instantly
- Good for validating strategy
- Shows what would have happened

#### Live Paper Trading
- Runs in real-time
- Executes trades as opportunities arise
- Can run for days/weeks/months
- Can be stopped anytime

### Managing Runs

#### View Details
- Click eye icon to see full analysis
- Review all trades
- Analyze performance metrics

#### Stop Run
- Click stop button for live runs
- Calculates final metrics
- Preserves trade history

#### Delete Run
- Removes run and all trade data
- Cannot be undone

### Comparing Strategies

**Example: Value vs Growth**

1. Create Run 1: "Value Strategy" (low P/E, high ROE)
2. Create Run 2: "Growth Strategy" (high earnings growth)
3. Run both for same time period
4. Compare:
   - Which has higher return?
   - Which has better win rate?
   - Which has lower drawdown?
5. Choose winner for live trading

---

## Backtesting

**Location:** Dashboard → Backtesting

Test O'Shaughnessy strategies on historical data to validate performance.

### Running a Backtest

**Example: Testing Small Cap Value Strategy**

#### Step 1: Configure Test

1. Go to **Backtesting**
2. Select parameters:
   ```
   Screen: "Small Cap Value"
   Date Range: Jan 1, 2025 - Nov 18, 2025
   Starting Capital: $100,000
   Max Positions: 10
   Trailing Stop: 15%
   ```

3. Click **"Run Backtest"**

#### Step 2: Review Results

**Performance Summary:**
- Total Return: 18.5%
- Win Rate: 62%
- Total Trades: 45
- Winning: 28
- Losing: 17
- Sharpe Ratio: 1.65
- Max Drawdown: -8.2%

**Portfolio Value Chart:**
- Daily portfolio value over time
- Compare to benchmark (S&P 500)

**Trade History:**
- Every trade executed
- Entry/exit dates and prices
- P&L for each trade
- Days held
- Exit reason

### Understanding the Strategy

The backtest simulates this daily workflow:

1. **Screen Stocks:** Apply O'Shaughnessy criteria
2. **Filter for Momentum:** Keep only stocks with positive 3M momentum
3. **Enter Positions:** Buy top-ranked stocks (up to max positions)
4. **Set Trailing Stops:** Protect gains
5. **Monitor Daily:** Check for exit signals
6. **Exit When:**
   - Trailing stop hit
   - Momentum turns negative
   - 30 days holding period

### Important Notes

**Limitations:**
- Uses 3M momentum as proxy for positive news
- Historical news data not available
- Results approximate real strategy

**Uses Real Data:**
- Historical stock prices
- Real fundamental metrics
- Actual market conditions

---

## Watchlist Management

**Location:** Dashboard → Watchlist

Your watchlist contains stocks that passed screening criteria.

### Understanding Watchlist Entries

Each stock shows:
- **Ticker & Company Name**
- **Score:** Algorithmic ranking (higher = better)
- **Price & Market Cap**
- **Key Ratios:** P/E, P/S
- **Momentum:** 3-month performance
- **Sentiment:** News sentiment score
- **Earnings Date:** Next earnings report
- **Screen:** Which screen added it

### Filtering

- **By Screen:** Show stocks from specific strategy
- **By Ticker:** Search for specific stock

### Actions

- **View Details:** Click stock to see full information
- **Remove:** Delete from watchlist

---

## Positions & Trades

### Open Positions

**Location:** Dashboard → Positions

View all currently held stocks:

**Summary Stats:**
- Total Open Positions
- Total Position Value
- Unrealized P&L (total)
- Win Rate (% winning)

**Position Details:**
- Ticker
- Quantity
- Entry Price
- Current Price
- Unrealized P&L
- Trailing Stop Price
- Time Held

**Actions:**
- **Close Position:** Manually exit (overrides automation)

### Trade History

**Location:** Dashboard → Trades

Review all completed trades:

**Performance Stats:**
- Total Trades
- Total P&L
- Win Rate
- Average Hold Time

**Filters:**
- Search by ticker
- Filter by result (winning/losing/open)

**Trade Details:**
- Ticker
- Quantity
- Entry/Exit Prices
- P&L ($ and %)
- Days Held
- Exit Reason (Trailing Stop, Manual, Stop Loss, etc.)

---

## Settings & Configuration

**Location:** Dashboard → Settings

### Appearance & Theme

**Changing Color Theme (Light/Dark Mode):**

The News Trader platform supports both light and dark color themes to match your preference and reduce eye strain.

**To Switch Themes:**
1. Look at the **top-right corner** of any dashboard page
2. Find the **sun/moon icon** button (next to your name)
3. Click the icon to toggle between themes:
   - ☀️ **Sun icon** = Currently in light mode (click to switch to dark)
   - 🌙 **Moon icon** = Currently in dark mode (click to switch to light)

**Theme Persists:**
- Your theme choice is saved automatically
- Applies across all pages
- Remembers your preference on next login

**Light Mode:**
- White backgrounds
- Dark text
- Best for bright environments
- Reduces battery usage on LCD screens

**Dark Mode:**
- Dark backgrounds
- Light text
- Reduces eye strain in low-light conditions
- Better for OLED screens (saves battery)
- Preferred by many traders for extended sessions

---

### Trading Account Settings

**Capital & Risk:**
- **Starting Capital:** Initial account balance
- **Max Positions:** Max simultaneous holdings
- **Trailing Stop %:** Automatic stop loss percentage

**Mode:**
- **Paper Trading:** Toggle on/off (keep ON for testing)

### API Configuration

**Alpaca Integration:**
1. Get API keys from https://alpaca.markets
2. For testing: Use **Paper Trading** keys
3. Enter:
   - API Key ID
   - Secret Key
4. Toggle **"Use Paper Trading"** (recommended)
5. Click **"Test Connection"**
6. If successful, click **"Save Settings"**

### Screening Criteria

Configure default O'Shaughnessy parameters:
- Valuation thresholds
- Financial health minimums
- Growth requirements
- Market cap ranges

---

## Common Workflows

### Workflow 1: Finding Undervalued Dividend Stocks

**Goal:** Find profitable companies with good dividends

1. **Create Screen** (Screens page)
   ```
   Name: "Dividend Value"
   Max P/E: 15
   Min ROE: 10%
   Min Dividend Yield: 3%
   Min Market Cap: $1B
   ```

2. **Run Screen** → Populates watchlist

3. **Review Watchlist** → Check top stocks

4. **Research Stocks** (Market page)
   - Click each ticker
   - Review fundamentals
   - Check news

5. **Paper Trade** (Paper Trading Lab)
   - Create new run
   - Select "Dividend Value" screen
   - Run historical test first
   - If good results, run live

### Workflow 2: Earnings Event Trading

**Goal:** Trade quality stocks that beat earnings

1. **Review Earnings Calendar**
   - See who's reporting this week

2. **Apply Quality Filters**
   ```
   Max P/E: 20
   Min ROE: 15%
   Min Market Cap: $5B
   ```

3. **Hand-Pick Stocks**
   - Select 5-10 you trust
   - Check their boxes

4. **Create Earnings Monitor**
   ```
   Name: "Tech Earnings Nov"
   Min Surprise: 5%
   Selected: AAPL, MSFT, GOOGL, META, NVDA
   ```

5. **Paper Trade Live**
   - System auto-trades beats
   - Review results weekly

### Workflow 3: Strategy Validation

**Goal:** Test before going live

1. **Create Strategy** (Screens)
   - Define your criteria

2. **Backtest** (Backtesting page)
   - Test on 6+ months of data
   - Check win rate > 55%
   - Verify positive Sharpe ratio

3. **Paper Trade Historical** (Paper Trading Lab)
   - Test last 2 months
   - Verify consistent results

4. **Paper Trade Live** (Paper Trading Lab)
   - Run for 2-4 weeks
   - Monitor daily
   - Check performance

5. **Go Live** (Settings)
   - If paper trading successful
   - Switch to live API keys
   - Start small (reduce capital)

---

## Tips & Best Practices

### Screening Strategies

✅ **DO:**
- Start with conservative filters (broader universe)
- Test multiple variations
- Run screens daily to catch new opportunities
- Focus on 2-3 quality metrics rather than 20

❌ **DON'T:**
- Use extremely tight filters (0 results)
- Create 20+ screens (hard to manage)
- Forget to refresh regularly
- Ignore data quality scores

### Earnings Trading

✅ **DO:**
- Pre-filter by quality before earnings
- Manually curate your monitored list
- Set realistic min surprise (5-10%)
- Limit to stocks you understand

❌ **DON'T:**
- Monitor 100+ stocks (unfocused)
- Trade every earnings beat (quality matters)
- Ignore the underlying business
- Skip the filtering step

### Paper Trading

✅ **DO:**
- Test every strategy before going live
- Run historical tests first (fast validation)
- Compare multiple strategies
- Track why trades win/lose

❌ **DON'T:**
- Skip testing (costly mistakes)
- Use tiny sample sizes (< 20 trades)
- Ignore max drawdown
- Trust strategies with < 55% win rate

### Risk Management

✅ **DO:**
- Use trailing stops (15% is good start)
- Limit max positions (diversification)
- Start with small capital when going live
- Review trades weekly

❌ **DON'T:**
- Remove stop losses (always use them)
- Put 100% in one stock
- Go live with full capital immediately
- Ignore losing trades (learn from them)

---

## Troubleshooting

### Issue: No stocks in watchlist after running screen

**Solutions:**
1. Check screen criteria (too restrictive?)
2. Verify stock data is loaded:
   - Go to Market page
   - Check data refresh status
3. Try broader filters
4. Click "Run Screen Now" button

### Issue: Market search returns no results

**Possible Causes:**
- Stock data download incomplete
- Ticker not in database (check spelling)

**Solutions:**
1. Check data refresh status (Dashboard → Market)
2. Search by company name instead of ticker
3. Try different exchange filter
4. Wait for initial data download (2-4 hours first time)

### Issue: Alpaca connection test fails

**Solutions:**
1. Verify API keys (no extra spaces)
2. Check "Use Paper Trading" toggle
3. Ensure keys are from Paper Trading section (not Live)
4. Verify Alpaca account is active

### Issue: Earnings calendar is empty

**Solutions:**
1. Run earnings fetch script (admin access required)
2. Wait - automatically updates daily at 2 AM
3. Check date range (next 30 days only)

### Issue: Backtest shows no trades

**Possible Causes:**
- No stock data for date range
- Filters too restrictive
- No stocks with positive momentum

**Solutions:**
1. Use more recent dates (2025)
2. Broaden screen criteria
3. Check screen has some watchlist stocks

---

## Appendix A: Metric Definitions

### Valuation Metrics

**P/E Ratio (Price-to-Earnings)**
- Price ÷ Annual Earnings
- Lower = Cheaper
- Typical range: 10-25
- < 15 = Value, > 25 = Growth/Overvalued

**P/S Ratio (Price-to-Sales)**
- Price ÷ Annual Revenue
- Good for unprofitable companies
- < 2 = Reasonable

**P/B Ratio (Price-to-Book)**
- Price ÷ Book Value
- < 1 = Trading below asset value
- Useful for banks, real estate

**P/CF Ratio (Price-to-Cash-Flow)**
- Price ÷ Operating Cash Flow
- Harder to manipulate than earnings
- < 15 = Reasonable

### Financial Health

**ROE (Return on Equity)**
- Net Income ÷ Shareholder Equity
- % return on invested capital
- > 15% = Strong profitability

**Debt-to-Equity**
- Total Debt ÷ Total Equity
- < 0.5 = Conservative
- < 1.0 = Reasonable
- > 2.0 = High leverage risk

**Current Ratio**
- Current Assets ÷ Current Liabilities
- > 1.5 = Healthy liquidity
- < 1.0 = Potential cash problems

### Growth Metrics

**Revenue Growth**
- Year-over-year revenue increase
- > 10% = Strong growth
- Negative = Shrinking business

**Earnings Growth**
- Year-over-year earnings increase
- > 15% = Excellent
- Should exceed revenue growth

### Performance Metrics

**Sharpe Ratio**
- Risk-adjusted returns
- (Return - Risk-Free Rate) ÷ Volatility
- > 1.0 = Good
- > 2.0 = Excellent

**Max Drawdown**
- Largest peak-to-trough decline
- -10% = Manageable
- -20%+ = High risk

**Win Rate**
- % of profitable trades
- > 55% = Good
- > 60% = Excellent

**Profit Factor**
- Gross Profit ÷ Gross Loss
- > 1.5 = Good
- > 2.0 = Excellent

---

## Appendix B: Quick Reference

### Keyboard Shortcuts

None currently implemented.

### Status Indicators

**Badges:**
- 🟢 Active = Screen is running
- 🔴 Inactive = Screen is paused
- ⚡ Earnings = Earnings-based strategy
- 📊 O'Shaughnessy = Traditional value strategy

**Trade Exit Reasons:**
- TRAILING_STOP = Profit target hit
- STOP_LOSS = Loss limit hit
- MANUAL = User closed position
- MOMENTUM_LOSS = Stock momentum turned negative
- TIME_CUTOFF = Max holding period reached

---

## Updates & Version History

**Version 1.0 - November 18, 2025**
- Initial release
- O'Shaughnessy screening
- Earnings calendar monitoring
- Paper Trading Lab
- Backtesting engine
- Stock selection with checkboxes
- Manual stock curation for earnings

**Planned Features:**
- Tabs UI for applying existing screens to earnings
- Save custom filters as screens directly from earnings page
- Mobile app
- Advanced charting
- Portfolio optimizer
- Real-time alerts

---

## Support

**Issues & Questions:**
- Email: support@cloudstacknetworks.com
- User Guide: Available in the platform under Dashboard → User Guide

**Resources:**
- O'Shaughnessy: "What Works on Wall Street"
- Alpaca Docs: https://alpaca.markets/docs
- Finnhub Docs: https://finnhub.io/docs/api

---

*This manual is maintained as features are added and updated.*

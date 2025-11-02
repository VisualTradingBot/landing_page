# Graph Executor System - Architecture Guide

## Overview

The demo has been upgraded from **hardcoded strategy logic** to a **fully dynamic graph-based execution engine**. Now the visual node connections actually construct and execute the trading algorithm.

## How It Works

### 1. **Graph Traversal & Parameter Flow**

The system works in two phases:

**Phase 1: Pre-calculation**

- All Indicator nodes are found and executed
- Indicator outputs are stored by **parameter ID** (not node ID)
- No graph traversal needed - indicators don't need connections

**Phase 2: Execution**

- Graph traversal starts from Input node
- If nodes reference parameters that hold indicator values
- Execute nodes are reached via conditional paths

```
Input → If Entry → Execute Buy
         ↑
         | (reads parameter)
         |
    Indicator (writes to parameter)
```

**Key insight**: Indicators write to parameters, If nodes read from parameters. No direct connection needed!

### 2. **Node Types & Behavior**

#### **Input Node**

- Provides price data to the strategy
- Starting point for graph traversal
- Configuration: asset selection, data source

#### **Indicator Node**

- Calculates technical indicators (SMA, EMA, RSI, etc.)
- Pre-calculated for all price bars
- **Does NOT need connections to other nodes**
- Writes output to a parameter via the `output` variable field
- Variables:
  - `output`: Parameter that receives the indicator values
  - `window`: Lookback period

**How it works**: Drag a parameter (e.g., `indicator_output`) into the indicator's output field. The indicator will compute values and store them in that parameter. Any If node that uses the same parameter will read those values.

#### **If Node** (Conditional Branch)

- Evaluates a condition: `left operator right`
- Routes execution based on result:
  - **True path**: Bottom handle → executes if condition met
  - **False path**: Right handle → executes if condition fails
- Variables:
  - `var-1`: Left side of comparison
  - `var-2`: Right side of comparison
  - `operator`: Comparison operator (>, <, ==, >=, <=)

#### **Execute Node**

- Generates trading signals (buy/sell)
- Only executes if reached via graph traversal
- Configuration: `action` property

#### **SetParameter Node**

- (Future) Store intermediate calculations
- Build complex multi-step strategies

### 3. **Execution Flow**

For each price bar (daily candle):

1. **Prepare Context**:
   - Current price, index, entry price, position state
   - Pre-calculated indicators
2. **Traverse Graph**:
   - Start at Input node
   - Follow edges based on node logic
   - If nodes create branches (True/False paths)
3. **Collect Actions**:
   - Execute nodes generate buy/sell signals
   - Only nodes reached via valid paths trigger
4. **Apply Actions**:

   - Execute trades with fee calculation
   - Update position and equity

5. **Track State**:
   - Maintain position, entry price, cash
   - Record trades for analysis

### 4. **Parameter Resolution**

The system intelligently resolves parameter values:

| Parameter Type   | Example              | Resolution                          |
| ---------------- | -------------------- | ----------------------------------- |
| Close price      | `"close"`            | Current bar's close price           |
| Entry price      | `"entry * 0.95"`     | 95% of entry price (stop-loss)      |
| Indicator output | `"indicator_output"` | Value from connected Indicator node |
| Numeric constant | `"30"`               | Parsed as number                    |

### 5. **Current Strategy Example**

The default setup implements a **30-day high breakout with stop-loss**:

```
┌──────────────┐
│   Input      │  (Data source)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Indicator   │  (Calculates 30-day rolling high)
│  window: 30  │
│  output: ────────► indicator_output parameter
└──────────────┘

       (No connection below - parameters link the logic!)

┌──────────────────┐
│   If Entry       │  ← Root node (reads parameters)
│  close_price     │
│  indicator_output│  ← Reads from parameter
└────┬─────────┬───┘
     │ True    │ False
     ▼         │
┌──────────┐   │
│Execute   │   │
│  Buy     │   │
└──────────┘   │
               ▼
          ┌────────────────────┐
          │   If Exit          │  (reads parameters)
          │  close_price       │
          │  stop_loss_level   │
          └────────┬───────────┘
                   │ True
                   ▼
              ┌──────────┐
              │Execute   │
              │  Sell    │
              └──────────┘
```

**Notice**:

- Indicator has NO outgoing edge to If nodes!
- If Entry is a **root node** (starts its own tree)
- Parameters bridge: Indicator writes, If reads

## Key Features

### ✅ **Dynamic Construction**

- Strategy is built from graph structure, not hardcoded
- Add/remove nodes → algorithm changes immediately
- Reconnect edges → execution flow changes

### ✅ **Flexible Indicators**

- 8 technical indicators supported
- Change indicator type → strategy adapts
- Multiple indicators possible (just add more nodes)

### ✅ **Complex Logic**

- Chain multiple If nodes for sophisticated conditions
- Create parallel execution paths
- Build multi-step entry/exit logic

### ✅ **Visual Debugging**

- See exactly how strategy executes
- Green dots = entry, Red dots = exit
- Equity curve shows performance

## Migration Notes

### No More Legacy Code

All hardcoded logic has been removed:

- No more looking for specific node IDs like `"ifNode-1"`
- No more hardcoded action extraction
- Everything is driven by the graph structure

### What Changed

1. **Demo.jsx**: Removed all hardcoded logic, now just passes nodes/edges
2. **BacktestView.jsx**: Always uses `executeGraphStrategy`, no legacy fallback
3. **graphExecutor.js**: Parameter-based indicator system (indicators write to params)

### What Stayed The Same

- All current nodes, edges, and parameters work identically
- Visual appearance unchanged
- Backtest results should be identical (for same graph)
- Parameters still drag-and-drop into nodes

## Future Enhancements

### Possible Node Types

- **Combine**: Merge multiple conditions (AND/OR logic)
- **Calculate**: Math operations on parameters
- **Store**: Save intermediate values
- **Loop**: Iterate over price history

### Advanced Features

- **Multi-asset**: Compare BTC vs ETH
- **Portfolio**: Manage multiple positions
- **Risk Management**: Position sizing based on volatility
- **Optimization**: Auto-tune parameters

### Performance

- **Caching**: Store indicator calculations between runs
- **Parallel**: Run multiple strategies simultaneously
- **Streaming**: Real-time data updates

## Code Structure

```
src/utils/
  ├── backtest.js          # Legacy backtest logic + indicators
  └── graphExecutor.js     # NEW: Graph-based execution engine
      ├── executeGraphStrategy()    # Main entry point
      ├── traverseGraph()           # Recursive graph walker
      ├── evaluateIfNode()          # Condition evaluation
      ├── resolveValue()            # Parameter resolution
      └── compare()                 # Comparison operators
```

## Testing The System

### 1. Verify Current Strategy Works

- Should see same results as before
- Check buy/sell signals match expected behavior

### 2. Modify The Graph

- **Change indicator**: Select SMA instead of 30d_high
- **Adjust window**: Change lookback_window to 20
- **Swap actions**: Make If Entry trigger sell instead

### 3. Add New Nodes

- Add another If node for additional exit condition
- Add Indicator node for multiple signals
- Chain conditions together

### 4. Break and Fix

- Disconnect nodes → verify strategy stops working
- Reconnect → verify recovery
- Remove nodes → verify graceful degradation

## Debugging Tips

### If Backtest Shows No Trades

- Check If node conditions are reachable
- Verify parameters are properly bound
- Check operator direction (> vs <)

### If Results Are Unexpected

- Console log traverseGraph to see execution path
- Verify indicator calculations are correct
- Check edge labels (True/False paths)

### If Errors Occur

- Check all nodes have required variables
- Ensure edges connect compatible handles
- Verify parameter values are valid

## Summary

You now have a **true visual strategy builder** where:

- ✅ Node connections define algorithm flow
- ✅ Parameter changes update strategy in real-time
- ✅ Multiple strategies possible by rearranging nodes
- ✅ Extensible for future node types and features

The system maintains all current functionality while opening the door to unlimited complexity and experimentation!

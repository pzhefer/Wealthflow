# 🎯 Goals System - Complete User Guide & Testing Steps

## **Table of Contents**
1. [Prerequisites](#prerequisites)
2. [Step 1: Create a Savings Account](#step-1-create-a-savings-account)
3. [Step 2: Create Your First Goal](#step-2-create-your-first-goal)
4. [Step 3: Add Goal Items (Budget Breakdown)](#step-3-add-goal-items-budget-breakdown)
5. [Step 4: Add Quotes for Price Comparison](#step-4-add-quotes-for-price-comparison)
6. [Step 5: Book Items & Track Actual Costs](#step-5-book-items--track-actual-costs)
7. [Step 6: Monitor Progress](#step-6-monitor-progress)
8. [Testing Checklist](#testing-checklist)
9. [Troubleshooting](#troubleshooting)

---

## **Prerequisites**

Before testing goals, make sure you have:
- ✅ App running (the dev server starts automatically)
- ✅ Logged in with a user account
- ✅ At least one account created (we'll create a savings account below)

---

## **Step 1: Create a Savings Account**

We need an account to link to our goal so the system can automatically track how much money you've saved.

### **Actions:**
1. Open the app
2. Tap the **"More"** tab (bottom navigation)
3. Tap **"Accounts"**
4. Tap the **"+ Add Account"** button
5. Fill in the form:
   ```
   Account Name: Vacation Savings
   Account Type: Savings
   Initial Balance: 500
   Currency: USD
   ```
6. Tap **"Add Account"**

### **Expected Result:**
- ✅ New account appears in the list
- ✅ Balance shows $500.00
- ✅ Status shows "Active"

### **Screenshot Location:**
Look for a card showing "Vacation Savings | $500.00"

---

## **Step 2: Create Your First Goal**

Let's create a vacation goal linked to the savings account we just created.

### **Actions:**
1. Still in **"More"** tab, tap **"Goals"**
2. You should see an empty state: "No Goals"
3. Tap the **"Add Goal"** button at the bottom
4. Fill in the goal form:
   ```
   Goal Name: Hawaii Vacation
   Goal Type: Purchase (tap the Shopping Bag icon)
   Target Amount: 1000
   Current Amount: (leave as 0, or enter 500 if you want)
   Linked Account: Tap to select "Vacation Savings"
   Target Date: 2025-08-01
   Description: Two-week vacation to Hawaii
   Notes: Save $100/month
   ```
5. Tap **"Add Goal"**

### **Expected Result:**
- ✅ Form closes
- ✅ New goal card appears showing:
  - Name: "Hawaii Vacation"
  - Progress bar showing current/target
  - "Vacation Savings" account name
  - "0 items" (we haven't added any yet)
  - "Due Aug 1, 2025"
  - Edit, Delete, and "View Details" buttons visible

### **What to Check:**
- Progress bar shows: "$500 / $1,000" (50%)
  - If you linked the account, it automatically uses the account balance!
- Progress bar color should be blue
- Shopping bag icon with orange background

---

## **Step 3: Add Goal Items (Budget Breakdown)**

Now let's break down our $1,000 vacation into specific categories.

### **Actions:**
1. On the goal card, tap **"View Details"** button
2. You'll see the **Goal Details** screen showing:
   - Overall Progress section
   - Budget Summary (all zeros for now)
   - Budget Breakdown section (empty)
3. Under "Budget Breakdown", tap **"Add Item"** button
4. Create first item - **Flights**:
   ```
   Item Name: Flights
   Budget Amount: 400
   Status: Planned (should be selected by default)
   Description: Round-trip flights for 2 people
   Notes: Check prices on Tuesdays
   ```
5. Tap **"Save"**
6. Tap **"Add Item"** again to create second item - **Accommodation**:
   ```
   Item Name: Accommodation
   Budget Amount: 400
   Status: Planned
   Description: 7 nights hotel or Airbnb
   ```
7. Tap **"Save"**
8. Tap **"Add Item"** once more for third item - **Activities**:
   ```
   Item Name: Activities
   Budget Amount: 200
   Status: Planned
   Description: Tours, dining, entertainment
   ```
9. Tap **"Save"**

### **Expected Result:**
- ✅ Three goal items now visible
- ✅ Each shows:
  - Status badge (gray circle with clock icon for "Planned")
  - Item name
  - Budget amount
  - "0 Quotes" button
  - Edit and Delete icons
- ✅ Budget Summary now shows:
  ```
  Total Budget (Items): $1,200
  Planned Cost (Quotes): $0.00
  Actual Spent: $0.00
  Remaining in Budget: $1,000.00
  ```

### **What to Check:**
- Notice the budget summary shows Total Budget is now $1,200 (400+400+200), which exceeds our goal's $1,000 target
- This is intentional - you can budget more than the goal and adjust later
- No quotes yet, so "Planned Cost" is zero
- No spending yet, so "Actual Spent" is zero

---

## **Step 4: Add Quotes for Price Comparison**

Let's research prices and add quotes for our flight options.

### **Actions:**

#### **Add Quotes for Flights:**
1. Tap on the **"0 Quotes"** button on the "Flights" item
2. You'll see the Quotes modal: "Flights | Quotes & Price Comparisons"
3. Tap **"Add Quote"** button
4. Fill in first quote:
   ```
   Vendor Name: Airline A
   Amount: 380
   Quote Date: (today's date - should be pre-filled)
   Notes: Direct flight, includes 1 checked bag
   ```
5. Tap **"Add Quote"** (bottom button)
6. You'll return to the quotes list, now showing 1 quote
7. Tap **"Add Quote"** again for second option:
   ```
   Vendor Name: Airline B
   Amount: 420
   Quote Date: (today's date)
   Notes: One stop, 8-hour flight
   ```
8. Tap **"Add Quote"**
9. Now you see 2 quotes listed
10. On the **Airline A** quote (cheaper option), tap **"Select This Quote"**
11. The quote card turns green with a "✓ Selected" badge
12. Tap the back/close button to return to Goal Details

#### **Add Quotes for Accommodation:**
1. Tap on the **"0 Quotes"** button on "Accommodation" item
2. Tap **"Add Quote"**
3. Add first option:
   ```
   Vendor Name: Hilton Waikiki
   Amount: 450
   Notes: Beachfront, includes breakfast
   ```
4. Tap **"Add Quote"**
5. Tap **"Add Quote"** again:
   ```
   Vendor Name: Airbnb Condo
   Amount: 350
   Notes: Full kitchen, parking included
   ```
6. Tap **"Add Quote"**
7. Select the **Airbnb Condo** option (cheaper)
8. Tap **"Select This Quote"**
9. Close and return to Goal Details

#### **Add Quote for Activities:**
1. Tap **"0 Quotes"** on "Activities"
2. Tap **"Add Quote"**
3. Add estimate:
   ```
   Vendor Name: Budget Estimate
   Amount: 200
   Notes: $50 dining, $100 tours, $50 misc
   ```
4. Tap **"Add Quote"**
5. Tap **"Select This Quote"**
6. Close

### **Expected Result:**
- ✅ Each item now shows "2 Quotes" or "1 Quote"
- ✅ Budget Summary updated:
  ```
  Total Budget (Items): $1,200
  Planned Cost (Quotes): $930 (380+350+200)
  Actual Spent: $0.00
  Remaining in Budget: $1,000.00
  ```
- ✅ Variance indicator: "💰 Saving $270 vs budget" or similar
  - This shows you're planning to spend $930, which is $270 less than your $1,200 item budgets

### **What to Check:**
- Selected quotes show with green background
- Quote amounts are used for "Planned Cost"
- You can compare prices easily
- Edit and delete options work on quotes

---

## **Step 5: Book Items & Track Actual Costs**

Now let's simulate booking the flights and tracking the actual expense.

### **Actions:**

#### **Book the Flights:**
1. Go back to main app (close Goal Details)
2. Tap **"Transactions"** tab (bottom navigation)
3. Tap the **"+"** button to add a new transaction
4. Fill in transaction form:
   ```
   Amount: 380
   Type: Expense (red icon)
   Account: Select "Vacation Savings"
   Category: Select "Travel" (or create one)
   Description: Airline A - Round-trip flights
   Date: (today)
   Notes: Booked via website, confirmation #ABC123
   ```
5. Tap **"Add Transaction"**

#### **Update Goal Item Status:**
1. Go back to **"More"** → **"Goals"**
2. Tap **"View Details"** on Hawaii Vacation
3. Tap on the **"Flights"** item (not the quotes button, tap the item itself)
4. In the edit modal:
   - Change Status to: **"Booked"** (orange with calendar icon)
5. Tap **"Save"**

### **Expected Result:**
- ✅ Flights item now shows:
  - Orange "Booked" badge
  - Budget: $400
  - Actual Spent: $380 (from transaction)
  - Variance: "💰 Saved $20"
- ✅ Budget Summary updated:
  ```
  Total Budget (Items): $1,200
  Planned Cost (Quotes): $930
  Actual Spent: $380
  Remaining in Budget: $620.00
  ```
- ✅ Goal's current amount decreased to $120 (account balance: 500-380=120)
- ✅ Overall progress bar updated

### **What to Check:**
- Account balance in "Vacation Savings" dropped to $120
- Goal progress shows $120 / $1,000 (12%)
- Transaction appears in Transactions tab
- Item shows actual vs budget comparison

---

## **Step 6: Monitor Progress**

Let's review all the information available.

### **What to Review:**

#### **Goal Details Screen:**
1. **Overall Progress Section:**
   - Shows: $120 / $1,000
   - Progress bar: 12%
   - Target Date: Aug 1, 2025
   - Linked Account: Vacation Savings

2. **Budget Summary:**
   - Total Budget: $1,200 (sum of all item budgets)
   - Planned Cost: $930 (selected quotes)
   - Actual Spent: $380 (booked flights)
   - Remaining: $620

3. **Budget Breakdown:**
   - ✅ **Flights** (Booked)
     - Budget: $400
     - Selected Quote: $380
     - Actual: $380
     - Saved $20! 💰
     - 2 Quotes

   - ⏳ **Accommodation** (Planned)
     - Budget: $400
     - Selected Quote: $350
     - Actual: $0
     - 2 Quotes

   - ⏳ **Activities** (Planned)
     - Budget: $200
     - Selected Quote: $200
     - Actual: $0
     - 1 Quote

#### **Goals List Screen:**
1. Tap back to see the goals list
2. Your goal card shows:
   - Name and description
   - Progress: $120 / $1,000 (12%)
   - Progress bar
   - Wallet icon: "Vacation Savings"
   - Target icon: "3 items"
   - Due date: "Due Aug 1, 2025"
   - Edit, Delete, View Details buttons

### **Actions to Test:**

#### **Edit Goal:**
1. Tap **Edit** icon (pencil)
2. Change target amount to $900
3. Save
4. Progress should update to $120 / $900 (13%)

#### **Add More Savings:**
1. Go to Transactions
2. Add income transaction:
   ```
   Amount: 200
   Type: Income
   Account: Vacation Savings
   Category: Savings Deposit
   Description: Monthly vacation savings
   ```
3. Go back to Goals
4. Current amount should now show $320 / $900 (36%)

#### **Book Accommodation:**
1. Add expense transaction for $350 to Vacation Savings
2. Update Accommodation item status to "Booked"
3. Check that:
   - Actual spent shows $350
   - Variance shows "💰 Saved $50"
   - Total actual spent: $730

---

## **Testing Checklist**

Use this checklist to verify all features work:

### **✅ Goals List**
- [ ] Can create new goal
- [ ] Can edit existing goal
- [ ] Can delete goal
- [ ] Account linking works
- [ ] Auto-calculation of current amount from account
- [ ] Item count displays correctly
- [ ] Account name displays
- [ ] Target date displays
- [ ] View Details button opens modal
- [ ] Progress bar shows correct percentage
- [ ] Edit/Delete buttons are visible and work

### **✅ Goal Details**
- [ ] Overall progress section displays
- [ ] Budget summary calculates correctly
- [ ] Can add goal items
- [ ] Can edit goal items
- [ ] Can delete goal items
- [ ] Item status badges display correctly
- [ ] Budget vs actual comparison shows
- [ ] Savings indicator shows when under budget
- [ ] Over-budget warning shows when over
- [ ] Quotes button shows correct count
- [ ] Back to goals list works

### **✅ Goal Items**
- [ ] Can create items with all fields
- [ ] Status selector works (5 statuses)
- [ ] Budget amount required validation
- [ ] Name required validation
- [ ] Sort order maintained
- [ ] Edit loads existing data
- [ ] Save updates correctly
- [ ] Delete removes item
- [ ] Cancel discards changes

### **✅ Quotes**
- [ ] Can add multiple quotes
- [ ] Can edit quotes
- [ ] Can delete quotes
- [ ] Can select one quote (only one at a time)
- [ ] Selected quote shows green badge
- [ ] Quote amounts used in planned cost
- [ ] Vendor name displays
- [ ] Quote date displays
- [ ] Notes display
- [ ] Empty state shows when no quotes

### **✅ Transactions Integration**
- [ ] Transactions reduce account balance
- [ ] Goal current amount auto-updates
- [ ] Can link transaction to goal item (future feature - field exists)
- [ ] Actual spent calculates from transactions

### **✅ Data Integrity**
- [ ] Deleting goal deletes items and quotes
- [ ] Deleting item deletes quotes
- [ ] Account deletion doesn't break goal
- [ ] All calculations accurate
- [ ] No data loss on edits

### **✅ User Experience**
- [ ] All buttons clearly labeled
- [ ] Icons make sense
- [ ] Colors consistent
- [ ] Loading states show
- [ ] Error messages helpful
- [ ] Forms validate input
- [ ] Modals stack properly
- [ ] Navigation smooth

---

## **Sample Test Scenario: Complete Vacation**

Here's a complete end-to-end test:

### **Setup (5 minutes):**
1. Create account: "Vacation Fund" with $1,000
2. Create goal: "European Trip" ($2,500 target)
3. Link to "Vacation Fund"

### **Planning (10 minutes):**
1. Add items:
   - Flights: $800 budget
   - Hotel: $1,000 budget
   - Food: $400 budget
   - Activities: $300 budget
2. Add 2-3 quotes per item
3. Select best quotes

### **Booking (5 minutes):**
1. Book flights ($750 transaction)
2. Change Flights status to "Booked"
3. Verify:
   - Account: $250 remaining
   - Goal: $250 / $2,500 (10%)
   - Flights: Shows $50 saved

### **Mid-trip Adjustment (5 minutes):**
1. Realize hotel more expensive
2. Edit Hotel item: $1,200 budget
3. Add new quote: $1,150
4. Select new quote
5. Verify budget summary updates

### **Completion (5 minutes):**
1. Book remaining items
2. Change all to "Completed"
3. Total spent vs budget comparison
4. Mark goal as complete

### **Expected Final State:**
- All items "Completed"
- Clear actual vs budget for each
- Total savings or overage shown
- Goal 100% or mark as complete manually

---

## **Common User Flows**

### **Flow 1: Emergency Fund Goal**
```
1. Create goal: "Emergency Fund" ($5,000)
2. Link to: "High-Yield Savings"
3. NO items needed (simple goal)
4. Add deposits monthly
5. Watch progress grow automatically
```

### **Flow 2: Debt Payoff Goal**
```
1. Create goal: "Pay Off Credit Card" ($3,000)
2. Type: Debt Payoff
3. Link to: Credit Card account (negative balance)
4. Add items:
   - Principal: $2,700
   - Interest: $300
5. Make payments, track progress
6. Goal complete when balance hits $0
```

### **Flow 3: Major Purchase Goal**
```
1. Create goal: "New Car" ($25,000)
2. Add items:
   - Down Payment: $5,000
   - Insurance: $2,000
   - Registration: $500
   - Accessories: $1,500
3. Research quotes
4. Save over time
5. Track which parts are funded
```

---

## **Troubleshooting**

### **Problem: Goal current amount not updating**
**Solution:**
- Make sure goal is linked to an account
- Transactions must be on that account
- Check account balance is correct
- Refresh goals list (close and reopen)

### **Problem: Items not showing in Goal Details**
**Solution:**
- Ensure you saved the item (not just canceled)
- Refresh by closing and reopening Goal Details
- Check item was created for correct goal ID

### **Problem: Quotes not affecting Planned Cost**
**Solution:**
- Must select a quote (tap "Select This Quote")
- Only selected quotes count toward planned cost
- Verify quote was saved successfully

### **Problem: Actual spent is zero despite transactions**
**Solution:**
- Currently, transactions don't auto-link to goal items
- This is a field prepared for future enhancement
- For now, track manually via item status and amounts

### **Problem: Budget summary doesn't add up**
**Solution:**
- Total Budget = sum of item budgets
- Planned Cost = sum of selected quotes only
- Actual Spent = manually tracked per item for now
- Check each item's budget and quotes

### **Problem: Can't delete goal**
**Solution:**
- Long-press or use delete button on goal card
- Confirm deletion in alert dialog
- All items and quotes will be deleted too (cascade)

### **Problem: Progress bar shows wrong percentage**
**Solution:**
- Progress = current_amount / target_amount
- If linked to account, uses account balance
- If not linked, uses manually entered current_amount
- Update account balance or goal's current amount

---

## **Advanced Features to Try**

1. **Multiple Goals on One Account:**
   - Create "Vacation" and "Emergency" goals
   - Link both to "General Savings"
   - Both track the same balance
   - See how you're allocating one pot of money

2. **Goal with No Items:**
   - Simple savings goal
   - No breakdown needed
   - Just track progress to target

3. **Goal with Many Items:**
   - Create "Wedding" goal
   - Add 10+ items (venue, catering, dress, etc.)
   - See how well system handles large breakdowns

4. **Changing Quotes:**
   - Add 5 quotes for one item
   - Compare them all
   - Select cheapest
   - Later find better deal, add new quote
   - Change selection

5. **Status Progression:**
   - Item: Planned → Quoted → Booked → Completed
   - Watch status badges change colors
   - Track journey from idea to done

6. **Over-Budget Scenario:**
   - Set item budget: $500
   - Selected quote: $600
   - See warning indicator
   - Adjust budget or find cheaper option

---

## **Visual Guide Reference**

### **Colors & Status:**
- **Gray (Planned):** Not started, just budgeted
- **Blue (Quoted):** Got price quotes, researching
- **Orange (Booked):** Committed, money will be spent
- **Green (Completed):** Done, paid for
- **Red (Cancelled):** Not doing this anymore

### **Icons:**
- **💰 (Saved):** Spent less than budget
- **⚠️ (Over):** Spent more than budget
- **✓ (Selected):** This quote is the plan
- **📋 (Quotes):** Price research
- **👁️ (View Details):** See full breakdown
- **✏️ (Edit):** Modify this item
- **🗑️ (Delete):** Remove this item
- **👛 (Wallet):** Linked account
- **🎯 (Target):** Item count

---

## **Tips for Best Experience**

1. **Link Goals to Accounts:** Auto-tracking is awesome!
2. **Use Status Badges:** They tell the story of your progress
3. **Get Multiple Quotes:** Make informed decisions
4. **Review Budget Summary:** Understand where you stand
5. **Update as You Go:** Mark items booked/completed
6. **Set Realistic Budgets:** Easier to save than overspend
7. **Check Linked Account:** Make sure balance is accurate
8. **Use Notes Fields:** Remember why you set that budget
9. **Delete Old Goals:** Keep list clean and focused
10. **Celebrate Wins:** When you save money, notice it! 💰

---

## **Next Steps After Testing**

Once you've verified everything works:

1. **Create Real Goals:** Your actual financial goals
2. **Import Existing Data:** If you have goals elsewhere
3. **Set Reminders:** For target dates
4. **Regular Reviews:** Weekly or monthly check-ins
5. **Adjust as Needed:** Life changes, goals should too

---

## **Need Help?**

If something doesn't work as expected:
1. Check this guide's troubleshooting section
2. Verify you followed the steps exactly
3. Check the database has the migration applied
4. Look for error messages in the app
5. Try refreshing or restarting the app

---

**🎉 You're now ready to use the complete Goals system!**

Start with a simple goal, then build up to more complex ones with multiple items and quotes. The system is designed to grow with your needs!

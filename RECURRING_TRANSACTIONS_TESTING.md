# 🔄 Recurring Transactions - Testing Guide

## Issue Fixed: Create Button Not Working

### **Problem:**
Clicking "Create" button in recurring transactions modal was not creating records.

### **Root Cause:**
Empty strings (`''`) were being passed for optional fields instead of `null` values.

### **Solution Applied:**
Updated the create function to explicitly convert empty strings to `null`:
```typescript
account_id: formData.account_id ? formData.account_id : null,
merchant_id: formData.merchant_id ? formData.merchant_id : null,
description: formData.description || '',
```

### **Testing Checklist:**

#### ✅ Basic Creation Tests
1. **Minimal Required Fields**
   - [ ] Name: "Test Recurring"
   - [ ] Amount: 100
   - [ ] Category: Any category
   - [ ] Frequency: Monthly
   - [ ] Result: Should create successfully

2. **With Optional Fields**
   - [ ] Add merchant
   - [ ] Add account
   - [ ] Add description
   - [ ] Add day of month
   - [ ] Result: Should create with all fields

3. **Different Types**
   - [ ] Create expense (-100)
   - [ ] Create income (+100)
   - [ ] Result: Both should work

#### ✅ Frequency Tests
- [ ] Daily frequency
- [ ] Weekly frequency
- [ ] Biweekly frequency
- [ ] Monthly frequency
- [ ] Quarterly frequency
- [ ] Yearly frequency

#### ✅ Day of Month Tests
- [ ] Monthly with day 1
- [ ] Monthly with day 15
- [ ] Monthly with day 31
- [ ] Quarterly with specific day
- [ ] Result: All should calculate next occurrence correctly

#### ✅ Merchant Integration
- [ ] Select merchant from dropdown
- [ ] Category auto-populates from merchant
- [ ] Favorite merchants show first
- [ ] Can clear merchant selection

#### ✅ Validation Tests
- [ ] Empty name - should show error
- [ ] Empty amount - should show error
- [ ] Invalid amount (letters) - should show error
- [ ] Empty category - should show error
- [ ] Day of month < 1 - should show error
- [ ] Day of month > 31 - should show error

#### ✅ List View Tests
- [ ] Created items appear in list
- [ ] Next occurrence date shows correctly
- [ ] Status badge shows (Active/Paused)
- [ ] Amount displays with correct sign

#### ✅ Actions Tests
- [ ] Pause button works
- [ ] Resume button works
- [ ] Delete button works (with confirmation)
- [ ] "Generate Due" button creates transactions

#### ✅ Dashboard Widget Tests
- [ ] Upcoming recurring items show on dashboard
- [ ] Shows next 5 items within 30 days
- [ ] Displays correct date, amount, category
- [ ] Color-coded correctly (green/red)

## Error Monitoring

If create still fails, check browser console for:
```
Creating recurring transaction with data: {...}
Insert error: {...}
```

Common issues:
1. **Foreign key constraint**: Category/Account/Merchant ID doesn't exist
2. **Check constraint**: Type not 'income', 'expense', or 'transfer'
3. **Check constraint**: Frequency not in allowed list
4. **Null constraint**: Required field is null

## Manual Database Verification

Test if record was created:
```sql
SELECT * FROM recurring_transactions
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 1;
```

## Edge Function Testing

Test automatic generation:
```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/generate-recurring-transactions
```

Should return:
```json
{
  "success": true,
  "count": X,
  "generated": [...],
  "message": "Generated X recurring transaction(s) for YYYY-MM-DD"
}
```

## Success Criteria

✅ Can create recurring transaction with only required fields
✅ Can create recurring transaction with all optional fields
✅ Merchant dropdown works and auto-populates category
✅ All frequencies calculate next occurrence correctly
✅ Dashboard shows upcoming recurring items
✅ Manual "Generate Due" button creates transactions
✅ Edge Function can generate transactions automatically
✅ Pause/Resume functionality works
✅ Delete functionality works with confirmation

---

**Last Updated:** November 26, 2025
**Status:** Fix applied, ready for testing

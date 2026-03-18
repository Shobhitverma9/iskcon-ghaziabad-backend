# PDF Receipt Generator Prototype

**⚠️ PROTOTYPE ONLY - DO NOT INTEGRATE**

This is a standalone prototype to demonstrate PDFKit receipt generation quality.

## What's Included

- ✅ Complete receipt layout matching your HTML design
- ✅ Indian number-to-words conversion (e.g., "Five Thousand One Hundred")
- ✅ All colors and styling from original template
- ✅ Sample donation data for testing
- ✅ Performance metrics (generation time, file size)

## How to Test

### Option 1: Quick Test (Recommended)
```bash
cd backend
npx ts-node src/prototype-receipt/test-receipt.ts
```

### Option 2: Direct Execution
```bash
cd backend
npx ts-node src/prototype-receipt/receipt-generator.ts
```

## What to Check

After running, a file `sample-receipt.pdf` will be created in the `prototype-receipt` folder.

**Compare with your original HTML receipt:**
1. ✅ Layout and structure
2. ✅ Colors (saffron, pink, purple, yellow boxes)
3. ✅ Text formatting and fonts
4. ✅ Border radius and styling
5. ✅ Overall professional appearance

## Performance Metrics

Expected results:
- **Generation Time:** 200-500ms
- **File Size:** 30-50 KB
- **Memory Usage:** ~20MB

## Sample Data Used

```typescript
{
  id: '12345',
  date: '10/02/2026',
  amount: 5100,
  fullName: 'Radha Krishna Das',
  address: 'Hare Krishna Marg, Vrindavan',
  pinCode: '281121',
  panNo: 'ABCDE1234F',
  mobileNo: '+91 9876543210',
  email: 'radha.krishna@example.com',
  paymentMethod: 1, // UPI
  transactionDetails: 'UPI/9876543210@paytm',
  purposeId: 'Anna Daan Seva',
  user: 'Temple Administrator'
}
```

## Next Steps

After reviewing the PDF quality:

1. **If satisfied:** Proceed with full integration
2. **If adjustments needed:** Let me know what to change
3. **If not satisfied:** We can explore alternative approaches

## Files

- `receipt-generator.ts` - Main PDF generation logic
- `test-receipt.ts` - Test runner script
- `sample-receipt.pdf` - Generated output (created after running)
- `README.md` - This file

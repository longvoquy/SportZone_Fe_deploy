# Turn 1 Frontend - Integration Guide

## Files Created

1. **THUNK_INSERT.ts** - Redux thunk code to insert
2. **SLICE_UPDATES.ts** - Redux slice updates
3. **DateRangePicker.tsx** - New UI component

---

## Integration Steps

### Step 1: Update Redux Thunk

**File:** `e:\Capstone-project\FE\src\features\booking\bookingThunk.ts`

**Action:** Insert code from `THUNK_INSERT.ts` after `createFieldBooking` (line ~113)

**Location:**
```typescript
export const createFieldBooking = createAsyncThunk<...>(...);

// ⭐ INSERT HERE (from THUNK_INSERT.ts)

export const cancelFieldBooking = createAsyncThunk<...>(...);
```

---

### Step 2: Update Redux Slice

**File:** `e:\Capstone-project\FE\src\features\booking\bookingSlice.ts`

**Actions:**
1. Add import (top of file)
2. Update BookingState interface
3. Update initialState
4. Add extraReducers cases

**Reference:** `SLICE_UPDATES.ts`

---

### Step 3: Use DateRangePicker in BookCourtTab

**File:** `e:\Capstone-project\FE\src\pages\field-booking-page\fieldTabs\bookCourt.tsx`

**Changes:**

```tsx
import { DateRangePicker, DatePreview } from '@/components/booking/DateRangePicker';
import { createConsecutiveDaysBooking } from '@/features/booking/bookingThunk';

// Add state
const [bookingMode, setBookingMode] = useState<'single' | 'consecutive'>('single');
const [dateRange, setDateRange] = useState({ start: '', end: '' });

// Add to JSX
<div className="mb-4">
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={bookingMode === 'consecutive'}
      onChange={(e) => setBookingMode(e.target.checked ? 'consecutive' : 'single')}
    />
    <span>Đặt nhiều ngày liên tục</span>
  </label>
</div>

{bookingMode === 'consecutive' ? (
  <>
    <DateRangePicker
      startDate={dateRange.start}
      endDate={dateRange.end}
      onStartDateChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
      onEndDateChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
    />
    
    <DatePreview
      startDate={dateRange.start}
      endDate={dateRange.end}
      pricePerDay={calculatedPrice} // From existing logic
    />

    <Button
      onClick={() => handleConsecutiveBooking()}
      disabled={!dateRange.start || !dateRange.end}
    >
      Đặt sân liên tục
    </Button>
  </>
) : (
  // ... existing single booking UI
)}
```

**Add handler:**
```tsx
const handleConsecutiveBooking = async () => {
  try {
    const result = await dispatch(createConsecutiveDaysBooking({
      fieldId: currentField.id,
      courtId: selectedCourt.id,
      startDate: dateRange.start,
      endDate: dateRange.end,
      startTime: formData.startTime,
      endTime: formData.endTime,
      selectedAmenities: selectedAmenityIds,
      // ... other fields
    })).unwrap();

    // Navigate to payment or success page
    console.log('Bookings created:', result.summary);
  } catch (error: any) {
    // Show error with conflicts if any
    if (error.conflicts) {
      alert(`Conflicts: ${error.conflicts.map(c => c.date).join(', ')}`);
    }
  }
};
```

---

## Testing

### Backend is Ready
```bash
POST http://localhost:3000/bookings/consecutive-days
```

### Test Flow
1. Select "Đặt nhiều ngày liên tục"
2. Pick start & end dates
3. See preview of all dates
4. Click "Đặt sân liên tục"
5. Should create all bookings atomically

---

## Error Handling

**Conflict Response:**
```json
{
  "message": "Some dates are not available",
  "conflicts": [
    {
      "date": "2025-01-15",
      "reason": "Already booked 09:00-11:00"
    }
  ]
}
```

**Show to user:**
- List conflicting dates
- Option to change dates or pick different court

---

## Status: ✅ Ready for Manual Integration

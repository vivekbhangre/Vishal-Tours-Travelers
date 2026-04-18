import React from 'react';
import {
  Form,
  DatePicker,
  DateRangePicker,
  DateField,
  Calendar,
  RangeCalendar,
  NumberField,
  TextField,
  Input,
  Checkbox,
  CheckboxGroup,
  Button,
  Label,
  FieldError
} from '@heroui/react';

export default function BookingFormHeroUI() {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Manual validation logic to demonstrate isInvalid usage
    const newErrors: Record<string, string> = {};
    if (!data.oneWayDate) newErrors.oneWayDate = 'Please select a date.';
    if (!data.roundTripDates) newErrors.roundTripDates = 'Please select a date range.';
    if (!data.numberOfPeople || Number(data.numberOfPeople) < 1) newErrors.numberOfPeople = 'At least 1 person is required.';
    if (!data.name) newErrors.name = 'Name is required.';
    if (!data.terms) newErrors.terms = 'You must accept the terms.';

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      console.log('Form submitted:', data);
      alert('Form submitted successfully!');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-[#0047AB] mb-6 font-heading">Book Your Journey</h2>
      
      <Form validationErrors={errors} onSubmit={onSubmit} className="space-y-6">
        
        {/* Step 1: Dates */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#FF9933]">Step 1: Select Dates</h3>
          
          {/* One-way Date */}
          <DatePicker name="oneWayDate" isInvalid={!!errors.oneWayDate} className="flex flex-col gap-1">
            <Label className="text-[#0047AB] font-medium text-sm">One-way Date</Label>
            <DateField.Group className="flex items-center border border-[#0047AB]/20 rounded-xl px-3 py-2 hover:border-[#FF9933] focus-within:border-[#FF9933] focus-within:ring-1 focus-within:ring-[#FF9933]/20 transition-colors bg-gray-50">
              <DateField.InputContainer className="flex flex-1">
                {(segment) => <DateField.Segment segment={segment} className="focus:bg-[#0047AB] focus:text-white rounded px-0.5 outline-none" />}
              </DateField.InputContainer>
              <DatePicker.Trigger className="p-1 outline-none focus-visible:ring-2 focus-visible:ring-[#FF9933] rounded-md text-gray-500 hover:text-[#0047AB]">
                <DatePicker.TriggerIndicator />
              </DatePicker.Trigger>
            </DateField.Group>
            <DatePicker.Popover className="bg-white rounded-xl shadow-xl border border-gray-100 p-2">
              <Calendar>
                <Calendar.Header className="flex items-center justify-between mb-2">
                  <Calendar.NavButton slot="previous" className="p-1 hover:bg-gray-100 rounded-lg" />
                  <Calendar.Heading className="font-semibold text-[#0047AB]" />
                  <Calendar.NavButton slot="next" className="p-1 hover:bg-gray-100 rounded-lg" />
                </Calendar.Header>
                <Calendar.Grid>
                  <Calendar.GridHeader>
                    {(day) => <Calendar.HeaderCell className="text-xs text-gray-500 font-medium pb-2">{day}</Calendar.HeaderCell>}
                  </Calendar.GridHeader>
                  <Calendar.GridBody>
                    {(date) => <Calendar.Cell date={date} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FF9933]/10 focus:bg-[#0047AB] focus:text-white outline-none cursor-pointer text-sm" />}
                  </Calendar.GridBody>
                </Calendar.Grid>
              </Calendar>
            </DatePicker.Popover>
            <FieldError className="text-red-500 text-xs mt-1" />
          </DatePicker>

          {/* Round-trip Dates */}
          <DateRangePicker name="roundTripDates" isInvalid={!!errors.roundTripDates} className="flex flex-col gap-1">
            <Label className="text-[#0047AB] font-medium text-sm">Round-trip Dates</Label>
            <DateField.Group className="flex items-center border border-[#0047AB]/20 rounded-xl px-3 py-2 hover:border-[#FF9933] focus-within:border-[#FF9933] focus-within:ring-1 focus-within:ring-[#FF9933]/20 transition-colors bg-gray-50">
              <DateField.InputContainer slot="start" className="flex">
                {(segment) => <DateField.Segment segment={segment} className="focus:bg-[#0047AB] focus:text-white rounded px-0.5 outline-none" />}
              </DateField.InputContainer>
              <DateRangePicker.RangeSeparator className="mx-2 text-gray-400">-</DateRangePicker.RangeSeparator>
              <DateField.InputContainer slot="end" className="flex flex-1">
                {(segment) => <DateField.Segment segment={segment} className="focus:bg-[#0047AB] focus:text-white rounded px-0.5 outline-none" />}
              </DateField.InputContainer>
              <DateRangePicker.Trigger className="p-1 outline-none focus-visible:ring-2 focus-visible:ring-[#FF9933] rounded-md text-gray-500 hover:text-[#0047AB]">
                <DateRangePicker.TriggerIndicator />
              </DateRangePicker.Trigger>
            </DateField.Group>
            <DateRangePicker.Popover className="bg-white rounded-xl shadow-xl border border-gray-100 p-2">
              <RangeCalendar>
                <RangeCalendar.Header className="flex items-center justify-between mb-2">
                  <RangeCalendar.NavButton slot="previous" className="p-1 hover:bg-gray-100 rounded-lg" />
                  <RangeCalendar.Heading className="font-semibold text-[#0047AB]" />
                  <RangeCalendar.NavButton slot="next" className="p-1 hover:bg-gray-100 rounded-lg" />
                </RangeCalendar.Header>
                <RangeCalendar.Grid>
                  <RangeCalendar.GridHeader>
                    {(day) => <RangeCalendar.HeaderCell className="text-xs text-gray-500 font-medium pb-2">{day}</RangeCalendar.HeaderCell>}
                  </RangeCalendar.GridHeader>
                  <RangeCalendar.GridBody>
                    {(date) => <RangeCalendar.Cell date={date} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FF9933]/10 focus:bg-[#0047AB] focus:text-white outline-none cursor-pointer text-sm" />}
                  </RangeCalendar.GridBody>
                </RangeCalendar.Grid>
              </RangeCalendar>
            </DateRangePicker.Popover>
            <FieldError className="text-red-500 text-xs mt-1" />
          </DateRangePicker>
        </div>

        {/* Step 2: Passengers */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#FF9933]">Step 2: Passengers</h3>
          
          <NumberField name="numberOfPeople" defaultValue={1} minValue={1} isInvalid={!!errors.numberOfPeople} className="flex flex-col gap-1">
            <Label className="text-[#0047AB] font-medium text-sm">Number of People</Label>
            <NumberField.Group className="flex items-center border border-[#0047AB]/20 rounded-xl overflow-hidden hover:border-[#FF9933] focus-within:border-[#FF9933] focus-within:ring-1 focus-within:ring-[#FF9933]/20 transition-colors bg-gray-50">
              <NumberField.DecrementButton className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#FF9933]">-</NumberField.DecrementButton>
              <NumberField.Input className="flex-1 text-center bg-transparent outline-none py-2" />
              <NumberField.IncrementButton className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#FF9933]">+</NumberField.IncrementButton>
            </NumberField.Group>
            <FieldError className="text-red-500 text-xs mt-1" />
          </NumberField>
        </div>

        {/* Step 3: User Registration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#FF9933]">Step 3: Your Details</h3>
          
          <TextField name="name" isInvalid={!!errors.name} className="flex flex-col gap-1">
            <Label className="text-[#0047AB] font-medium text-sm">Full Name</Label>
            <Input className="border border-[#0047AB]/20 rounded-xl px-3 py-2 hover:border-[#FF9933] focus:border-[#FF9933] focus:ring-1 focus:ring-[#FF9933]/20 transition-colors bg-gray-50 outline-none" placeholder="Enter your name" />
            <FieldError className="text-red-500 text-xs mt-1" />
          </TextField>

          <CheckboxGroup name="terms" isInvalid={!!errors.terms} isRequired className="flex flex-col gap-1">
            <Checkbox value="true" className="flex items-start gap-2 group">
              <div className="flex items-center justify-center w-5 h-5 mt-0.5 border border-[#0047AB]/30 rounded group-data-[selected]:bg-[#FF9933] group-data-[selected]:border-[#FF9933] transition-colors">
                <Checkbox.Indicator className="text-white w-3 h-3" />
              </div>
              <Checkbox.Content className="text-gray-600 text-sm">
                I accept the terms and conditions
              </Checkbox.Content>
            </Checkbox>
            <FieldError className="text-red-500 text-xs mt-1" />
          </CheckboxGroup>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-[#0047AB] text-white font-medium shadow-md hover:bg-[#003380] hover:shadow-lg transition-all rounded-xl py-3"
        >
          Confirm Booking
        </Button>
      </Form>
    </div>
  );
}

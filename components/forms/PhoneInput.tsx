"use client";

import { useEffect, useState } from "react";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

const flag = (cc: string) => String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

/** Plain list for the first render (same on server and browser, so no hydration mismatch). */
function basicList() {
  return getCountries()
    .map((cc) => ({ cc, name: cc as string, code: getCountryCallingCode(cc) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Full country names, made in the browser only (Node and browsers name some countries differently). */
function countryList() {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return getCountries()
    .map((cc) => ({ cc, name: names.of(cc) ?? cc, code: getCountryCallingCode(cc) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * International phone input: any country. Gives back the full number,
 * e.g. +94771234567. Validation happens in the shared Zod schema.
 */
export default function PhoneInput({
  id, value, onChange, invalid, disabled, defaultCountry = "LK",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  defaultCountry?: CountryCode;
}) {
  const [countries, setCountries] = useState(basicList);
  useEffect(() => setCountries(countryList()), []);
  const parsed = value ? parsePhoneNumberFromString(value) : undefined;
  const [country, setCountry] = useState<CountryCode>(parsed?.country ?? defaultCountry);
  const [national, setNational] = useState<string>(parsed ? parsed.nationalNumber : value.replace(/^\+\d*/, ""));

  const emit = (cc: CountryCode, nat: string) => {
    const digits = nat.replace(/[^\d]/g, "").replace(/^0+/, "");
    onChange(digits ? `+${getCountryCallingCode(cc)}${digits}` : "");
  };

  return (
    <div className={cn("flex gap-2", disabled && "opacity-60")}>
      <div className="w-36 shrink-0 sm:w-44">
        <NativeSelect
          aria-label="Country"
          value={country}
          disabled={disabled}
          onChange={(e) => {
            const cc = e.target.value as CountryCode;
            setCountry(cc);
            emit(cc, national);
          }}
        >
          {countries.map((c) => (
            <option key={c.cc} value={c.cc}>
              {flag(c.cc)} {c.name} (+{c.code})
            </option>
          ))}
        </NativeSelect>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        placeholder={country === "LK" ? "77 000 0001" : "Phone number"}
        value={national}
        onChange={(e) => {
          setNational(e.target.value);
          emit(country, e.target.value);
        }}
        className="flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive md:text-sm"
      />
    </div>
  );
}

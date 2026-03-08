export interface ParsedAddress {
  streetNumber: number;
  streetName: string;
  streetSuffix: string;
  direction: string;
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string;
}

export function parseAddress(address: string): ParsedAddress {
  const pattern = /^(\d+)\s+((?:SW|NW|SE|NE)\s+)?(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5})$/;
  const match = address.match(pattern);

  if (!match) {
    throw new Error(`Invalid address format: ${address}`);
  }

  const [, streetNumberStr, direction = '', restStreet, city, state, zipCode] = match;
  const streetNumber = parseInt(streetNumberStr, 10);

  const streetParts = restStreet.trim().split(/\s+/);
  const streetSuffix = streetParts.pop() || '';
  const streetName = streetParts.join(' ');

  return {
    streetNumber,
    streetName,
    streetSuffix,
    direction: direction.trim(),
    city,
    state,
    zipCode,
    fullAddress: address,
  };
}

export function formatAddress(parsed: ParsedAddress): string {
  return `${parsed.streetNumber} ${parsed.direction} ${parsed.streetName} ${parsed.streetSuffix}, ${parsed.city}, ${parsed.state} ${parsed.zipCode}`;
}

export function getAddressKey(parsed: ParsedAddress): string {
  return `${parsed.direction}${parsed.streetName}${parsed.streetSuffix}`.toUpperCase();
}

export interface AddressSequence {
  key: string;
  direction: string;
  streetName: string;
  streetSuffix: string;
  numbers: number[];
  minNumber: number;
  maxNumber: number;
}

export function groupAddressesByStreet(addresses: string[]): Map<string, AddressSequence> {
  const groups = new Map<string, AddressSequence>();

  for (const address of addresses) {
    try {
      const parsed = parseAddress(address);
      const key = getAddressKey(parsed);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          direction: parsed.direction,
          streetName: parsed.streetName,
          streetSuffix: parsed.streetSuffix,
          numbers: [],
          minNumber: Infinity,
          maxNumber: -Infinity,
        });
      }

      const seq = groups.get(key)!;
      seq.numbers.push(parsed.streetNumber);
      seq.minNumber = Math.min(seq.minNumber, parsed.streetNumber);
      seq.maxNumber = Math.max(seq.maxNumber, parsed.streetNumber);
    } catch (error) {
      console.error(`Failed to parse address: ${address}`, error);
    }
  }

  for (const seq of groups.values()) {
    seq.numbers.sort((a, b) => a - b);
  }

  return groups;
}

export interface AddressGap {
  streetNumber: number;
  streetKey: string;
  streetName: string;
  streetSuffix: string;
  direction: string;
  fullAddress: string;
}

export function findAddressGaps(sequence: AddressSequence): AddressGap[] {
  const gaps: AddressGap[] = [];
  const numbersSet = new Set(sequence.numbers);

  for (let num = sequence.minNumber; num <= sequence.maxNumber; num++) {
    if (!numbersSet.has(num)) {
      gaps.push({
        streetNumber: num,
        streetKey: sequence.key,
        streetName: sequence.streetName,
        streetSuffix: sequence.streetSuffix,
        direction: sequence.direction,
        fullAddress: `${num} ${sequence.direction} ${sequence.streetName} ${sequence.streetSuffix}, Homestead, FL 33033`,
      });
    }
  }

  return gaps;
}

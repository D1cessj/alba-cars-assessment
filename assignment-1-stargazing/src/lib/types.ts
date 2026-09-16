export type ApodData = {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  mediaType: "image" | "video" | "other";
  copyright?: string;
  date: string;
};

export type WeatherData = {
  cloudCoverPercent: number;
  precipitationProbabilityPercent: number;
  temperatureC: number;
  sunset: string;
  sunrise: string;
  isNight: boolean;
};

export type MoonData = {
  illuminationPercent: number;
  phaseName: string;
};

export type StargazingScore = {
  value: number;
  label: "Excellent" | "Good" | "Fair" | "Poor" | "Very Poor";
  color: string;
  reasons: string[];
};

export type StargazingResponse = {
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  weather: WeatherData;
  moon: MoonData;
  apod: ApodData | null;
  apodError: string | null;
  score: StargazingScore;
  generatedAt: string;
};

export type GeocodeResult = {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

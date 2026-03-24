const tool_name = "weather_request";

interface WeatherInfo {
  city: string;
  description: string;
  temp: number;
  humidity: number;
  wind: number;
}

export interface WeatherToolResponse {
  structured_content: WeatherInfo;
  context: string;
}

/**
 * weatherHandler - returned weather info
 * @param city - city name
 * @returns string
 */
/**
 * weatherHandler - fetches weather info for a city using OpenWeatherMap API
 * @param city - city name
 * @returns Promise<string>
 */
/**
 * weatherHandler - fetches weather info for a city using OpenWeatherMap API
 * @param city - city name
 * @returns object
 */
export function weatherHandler(city: string): WeatherToolResponse{
  console.log(`Fetching weather for ${city}...`);

  // Mocked weather data
  const mockWeather: WeatherInfo = {
    city,
    description: "clear sky",
    temp: 22,
    humidity: 55,
    wind: 3.2
  };

  let response: WeatherToolResponse = {
    structured_content: {
      ...mockWeather
    },
    context: `${tool_name} response -> The current weather in ${city} is ${mockWeather.description} with a temperature of ${mockWeather.temp}°C, humidity at ${mockWeather.humidity}%, and wind speed of ${mockWeather.wind} m/s.`
  };

  return response;
}

const tool_name = "movie_request";

interface Movie {
    name: string;
    director: string;
    year: number;
    rating: number;
    genre: string;
    description: string;
}

interface MovieStructuredContent {
    movies: Array<Movie>;
}

export interface MovieToolResponse {
    action: string;
    structured_content: MovieStructuredContent;
    context: string;
}


const movies: Array<Movie> = [
    {
      name: "Avatar: Fire and Ash",
      director: "James Cameron",
      year: 2026,
      rating: 8.5,
      genre: "Sci-Fi",
      description: "The next chapter in the Avatar saga."
    },
    {
      name: "Zootopia 2",
      director: "Byron Howard",
      year: 2026,
      rating: 7.9,
      genre: "Animation",
      description: "A new adventure in Zootopia."
    },
    {
      name: "The Mandalorian and Grogu",
      director: "Jon Favreau",
      year: 2026,
      rating: 8.2,
      genre: "Action",
      description: "Star Wars universe continues."
    },
    {
      name: "28 Years Later: The Bone Temple",
      director: "Danny Boyle",
      year: 2026,
      rating: 7.5,
      genre: "Horror",
      description: "Sequel to the cult classic."
    },
    {
      name: "Avengers: Doomsday",
      director: "Anthony Russo",
      year: 2026,
      rating: 8.7,
      genre: "Superhero",
      description: "The Avengers face their greatest threat."
    }
];

/**
 * movieHandler - returned list of movies
 * @param action - top or search
 * @returns object
 */
export function movieHandler(action: string): MovieToolResponse {
  console.log(`Fetching movie ${action}...`);

  let content: MovieStructuredContent;
  switch (action) {
    case "top":
      content = topActionHandler();
      break;
    case "search":
      content = searchActionHandler("search query");
      break;
    default:
      console.warn(`Unknown action: ${action}. Returning top movies by default.`);
      content = topActionHandler();
  }

  return responseHandler(action, content);
}

/**
 * topActionHandler - returns the top-rated movies
 * @returns object
 */
function topActionHandler(): MovieStructuredContent {
  return {
    movies: movies.filter(movie => movie.rating >= 8.0)
  };
}

/**
 * searchActionHandler - returns movies matching the search query
 * @param query - search query
 * @returns object
 */
function searchActionHandler(query: string): MovieStructuredContent {
  const filteredMovies = movies.filter(movie =>
    movie.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ||
    movie.director.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );

  return {
    movies: filteredMovies
  };
}

/**
 * responseHandler - handles the response for the movie tool
 * @param action - action performed
 * @param structured_content - structured content of the response
 * @returns MovieToolResponse
 */
function responseHandler(action: string, content: MovieStructuredContent): MovieToolResponse {
  const context = contextOptimizer(content.movies);
  return {
    action,
    structured_content: content,
    context: context
  };
}

/**
 * contextOptimizer - optimizes the context for the response
 * @param movies - list of movies
 * @returns string
 */
function contextOptimizer(movies: Movie[]): string {
  if (!movies.length) {
    return "No movies found matching your criteria.";
  }

  const genres = Array.from(new Set(movies.map(movie => movie.genre))).join(", ");
  const movieNames = movies.map(movie => movie.name).join(", ");
  return `${tool_name} response -> Found ${movies.length} movie(s): ${movieNames}. Genres included: ${genres}.`;
}
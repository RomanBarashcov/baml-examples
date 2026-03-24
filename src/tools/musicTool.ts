const tool_name = "music_request";

interface Album {
    id: number;
    name: string;
    artist: string;
    year: number;
    rating: number;
    genre: string;
    description: string;
}

interface AlbumStructuredContent {
    albums: Album[];
}

export interface MusicToolResponse {
    action: string;
    structured_content: AlbumStructuredContent;
    context: string;
}

const albums: Album[] = [
    {
        id: 1,
        name: "The Fall-Off",
        artist: "J. Cole",
        year: 2026,
        rating: 8.8,
        genre: "Hip-Hop",
        description: "J. Cole's highly anticipated album exploring personal growth."
    },
    {
        id: 2,
        name: "Don't Be Dumb",
        artist: "A$AP Rocky",
        year: 2026,
        rating: 8.2,
        genre: "Rap",
        description: "A$AP Rocky returns with energetic beats and clever lyrics."
    },
    {
        id: 3,
        name: "Love Is Not Enough",
        artist: "Converge",
        year: 2026,
        rating: 7.9,
        genre: "Metalcore",
        description: "Converge delivers intense emotion and raw power."
    },
    {
        id: 4,
        name: "To Whom This May Concern",
        artist: "Jill Scott",
        year: 2026,
        rating: 8.5,
        genre: "Soul",
        description: "Jill Scott's soulful melodies and heartfelt lyrics shine."
    },
    {
        id: 5,
        name: "My Ghosts Go Ghost",
        artist: "By Storm",
        year: 2026,
        rating: 7.7,
        genre: "Indie Rock",
        description: "By Storm explores haunting themes with unique sound."
    }
];


/**
 * musicHandler - returned list of music
 * @param action - top or search
 * @returns object
 */
export function musicHandler(action: string): MusicToolResponse  {
  console.log(`Fetching music ${action}...`);

  let content: AlbumStructuredContent;
  switch (action) {
    case "top":
      content = topActionHandler();
      break;
    case "search":
      content = searchActionHandler("love"); // In a real implementation, you would get the search query from user input
      break;
    default:
      console.warn(`Unknown action: ${action}. Returning top albums by default.`);
  }

  return responseHandler(action, content);
};

/**
 * topActionHandler - returns the top-rated albums
 * @returns 
 */
function topActionHandler(): AlbumStructuredContent {
  return {
    albums: albums.filter(album => album.rating >= 8.0)
  };
}

/**
 * searchActionHandler - returns albums matching the search query
 * @param query - search query
 * @returns 
 */
function searchActionHandler(query: string): AlbumStructuredContent {
  // In a real implementation, you would search for albums based on user input
  const filteredAlbums = albums.filter(album =>
    album.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ||
    album.artist.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );

  return {
    albums: filteredAlbums
  };
}

/**
 * responseHandler - handles the response for the music tool
 * @param action - action performed
 * @param structured_content - structured content of the response
 * @returns MusicToolResponse
 */
function responseHandler(action: string, structured_content: AlbumStructuredContent): MusicToolResponse {
    const context = contextOptimizer(structured_content.albums);
    return {
        action,
        structured_content,
        context
    };
}

/**
 * contextOptimizer - optimizes the context for the response
 * @param albums - list of albums
 * @returns string
 */
function contextOptimizer(albums: Album[]): string {
    if (!albums.length) {
        return "No albums found matching your criteria.";
    }
    return albums.map(album =>
        `${tool_name} response -> ${album.name} by ${album.artist} (${album.year}) [${album.genre}] - Rating: ${album.rating}. ${album.description}`
    ).join("\n");
}
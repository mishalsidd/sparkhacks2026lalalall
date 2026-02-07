import MovieCard from "./MovieCard";

export default function MovieList({ movies, onLike, onToggleWatched, onDelete }) {
  if (movies.length === 0) {
    return (
      <div style={{ padding: 16, border: "1px dashed #bbb", borderRadius: 12 }}>
        No movies match your search.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {movies.map((movie) => (
        <MovieCard
          key={movie._id} 
          movie={movie}
          onLike={onLike}
          onToggleWatched={onToggleWatched}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

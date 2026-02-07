export default function MovieCard({ movie, onLike, onToggleWatched }) {
  return (
    <div
      style={{
        border: "1px solid #270040",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <h3>{movie.title} ({movie.year})  </h3>


      <p style={{ color: "#007ffe" }}>Genre: {movie.genre}</p>
      <button onClick={() => onLike(movie._id)}>
        {movie.liked ? "Favorited" : "Favorite"}
</button>
  <button onClick={() => LearnMore(movie._id)}>
        {} 
</button>
  
   


    </div>
  );
}

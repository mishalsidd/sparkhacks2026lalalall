import { useState } from "react";

export default function NewMovieForm({ onAddMovie }) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("2024");
  const [genre, setGenre] = useState("Drama");

  function handleSubmit(e) {
    e.preventDefault();

    if (!title.trim()) return;

    onAddMovie({
      _id: `tmp_${Date.now()}`,
      title,
      year: Number(year),
      genre,
      likes: 0,
      watched: false,
      liked: false
    });

    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add a Movie</h3>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Movie title"
      />

      <input
        type="number"
        value={year}
        onChange={(e) => setYear(e.target.value)}
      />

      <select value={genre} onChange={(e) => setGenre(e.target.value)}>
        <option>Drama</option>
        <option>Action</option>
        <option>Comedy</option>
        <option>Thriller</option>
      </select>

      <button type="submit">Add</button>
    </form>
  );
}

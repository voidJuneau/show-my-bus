import React, { useState, useEffect } from "react";
import { Container, makeStyles } from "@material-ui/core";
import Pagination from '@material-ui/lab/Pagination';

import LineListCard from "./LineListCard";

const getCount = async () => {
  return await (await fetch("/api/lines/count")).json();
}

const getLines = async (limit, page) => {
  return await (await fetch(`/api/lines?limit=${limit}&page=${page}`)).json();
}

export default function Lines({ setCenter, setMarkers, isMap, setIsMap }) {
  const classes = useStyles();
  const [ page, setPage ] = useState(1);
  const [ lines, setLines ] = useState([]);
  const [ totalPages, setTotalPages ] = useState(0);
  const limit = 5;
  
  useEffect(() => {
    getCount()
    .then(res => setTotalPages(Math.ceil(res / limit)));
  }, [setMarkers])

  useEffect(() => {
    getLines(limit, page)
    .then(lines => setLines(lines));
  }, [page])
  
  const handleChange = (event, value) => {
    setPage(value);
  }

  return (
    <Container>
      {lines.map(d => (<LineListCard line={d} key={d.route_id}
                          setCenter={setCenter} setMarkers={setMarkers}
                          isMap={isMap} setIsMap={setIsMap} />))}
      <div className={classes.root}>
        <Pagination count={totalPages} onChange={handleChange} />
      </div>
    </Container>
  )
}

const useStyles = makeStyles((theme) => ({
  root: {
    '& > *': {
      marginTop: theme.spacing(2),
    },
  },
}));

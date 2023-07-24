import React, { Fragment, useState, useEffect } from 'react'
import { Button } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { Icon } from 'vtex.store-icons';
import { useSearchPage } from 'vtex.search-page-context/SearchPageContext'
import { useRuntime } from 'vtex.render-runtime'


const CSS_HANDLES = [
  "previousPageButton",
  "previousPageButtonSpan",
  "previousPageButtonIcon",
  "nextPageButton",
  "nextPageButtonSpan",
  "nextPageButtonIcon",
  "currentPage",
  "page"
];

function shouldNotIncludeMap(map) {
  if (!map || map === 'b' || map === 'brand') {
    return true
  }

  const mapTree = map.split(',')

  if (mapTree.length > 3) {
    return false
  }

  return mapTree.every((mapItem) => mapItem === 'c')
}

export function getMapQueryString(searchQuery) {
  if (
    !searchQuery ||
    !searchQuery.variables ||
    shouldNotIncludeMap(searchQuery.variables.map)
  ) {
    return ''
  }

  return `&map=${searchQuery.variables.map}`
}

export function getQueryString(searchQuery) {
  if (
    !searchQuery ||
    !searchQuery.variables ||
    shouldNotIncludeMap(searchQuery.variables.query)
  ) {
    return ''
  }

  return `&query=${searchQuery.variables.query}`
}

const PageNavigatorButton = (props) => {
  const {
    to,
    from,
    recordsFiltered,
    onFetchMore,
    onFetchPrevious,
    onFetchGoTo,
    loading,
    nextPage,
    currentPage,
    previousPage,
    htmlElementForButton,
    maxItemsPerPage
  } = props

  const isAnchor = htmlElementForButton === 'a';
  const handles = useCssHandles(CSS_HANDLES)
  const { searchQuery } = useSearchPage()

  const [isLoading, setLoading] = useState(false);
  const lastPage = Math.max(Math.ceil(recordsFiltered / maxItemsPerPage), 1);
  
  const handleFetchMoreClick = (_ev) => {
    onFetchMore()
  }

  const handleFetchPreviousClick = (_ev) => {
    onFetchPrevious();
  }

  const handleFetchGoToClick = (page) => (_ev) => {
    setLoading(true);

    onFetchGoTo(page)
      .finally(() => setLoading(false));
  }

  const getTotalButtonsBefore = () => {
    if (currentPage === 1){ // Caso Primeiro
      return 0;
    } else if ((currentPage - 2) > 0){ // Caso possua 2 antecesores
      if (currentPage === lastPage){
        // Caso último
        if (lastPage > 4){
          return 4
        } else {
          return lastPage - 1
        }
      }

      return 2;
    } else {
      // Caso possua 1 antecessor
      return 1;
    }
  }

  const getTotalButtonsAfter = () => {
    if (currentPage === 1){ // Caso primeiro
      if (lastPage > 4){
        return 4
      }
      return lastPage - 1;
    } else if (currentPage === lastPage){ // Caso último
      return 0;
    } else if ( (currentPage + 2) <= lastPage) { // Caso Possua 2 sucessores
      return 2;
    } else { // Caso 1 sucessor
      return 1
    }
  }


  
  const { query } = useRuntime()
  var keys = Object.keys(query)
  var values = Object.values(query)
  let queryList = [];
  keys.map((key, indexKey) => {
      values.map((value, indexvalue) => {
          if(indexKey === indexvalue && key !== 'page'){
            let queryListItem = `${[key]}=${value}`
            queryList.push(queryListItem)
          }
      })
  })

  let queryStringFinal = ""
  queryList.map((item, index) => {
    let itemFormat = `&${item}`
    queryStringFinal = queryStringFinal + itemFormat
  })

  console.log("queryStringFinal :::: ", queryStringFinal)

  const getPageButtons = () => {
    const buttons = [];

    let totalButtonsBefore = getTotalButtonsBefore();
    let totalButtonsAfter = getTotalButtonsAfter();

    for (let buttonBefore = 1; buttonBefore <= totalButtonsBefore; buttonBefore++){
      let page = currentPage - (totalButtonsBefore - (buttonBefore - 1 ));
      buttons.push(
        <div className={handles.page}>
          <Button
            size="small"
            href={`?page=${page}${queryStringFinal}`}
            disabled={loading || isLoading}
            >
            { page }
          </Button>
        </div>
      )
    }

    buttons.push(
      <div className={handles.currentPage}>
        <Button
          disabled
          size="small"
          >
          { currentPage }
        </Button>
      </div>
    );

    for (let buttonAfter = 1; buttonAfter <= totalButtonsAfter; buttonAfter++){
      let page = currentPage + buttonAfter;
      
      buttons.push(
        <div className={handles.page}>
          <Button
            size="small"
            href={`?page=${page}${queryStringFinal}`}
            disabled={loading || isLoading}
            >
            { page }
          </Button>
        </div>
      )
    }
    
    return buttons;
  }
  return (
    <Fragment>
      { getPageButtons() }
    </Fragment>
  )
}

export default PageNavigatorButton

import { useState, useRef, useCallback, useEffect, useReducer } from 'react'
// eslint-disable-next-line no-restricted-imports
import { max } from 'ramda'
import { useRuntime } from 'vtex.render-runtime'
import {
  useSearchPageStateDispatch,
  useSearchPageState,
} from 'vtex.search-page-context/SearchPageContext'

import useSearchState from './useSearchState'

export const FETCH_TYPE = {
  NEXT: 'next',
  PREVIOUS: 'previous',
  GO_TO: 'go-to'
}

const useFetchingMore = () => {
  const [loading, localSetMore] = useState(false)
  const { isFetchingMore } = useSearchPageState()
  const dispatch = useSearchPageStateDispatch()
  const setFetchMore = useCallback(
    (value) => {
      dispatch({ type: 'SET_FETCHING_MORE', args: { isFetchingMore: value } })
      localSetMore(value)
    },
    [dispatch]
  )

  const stateValue = isFetchingMore == null ? loading : isFetchingMore

  return [stateValue, setFetchMore]
}

const handleFetchPage = async (
  from,
  to,
  direction,
  fetchMoreLocked,
  setLoading,
  fetchMore,
  products,
  updateQueryError,
  fuzzy,
  operator,
  searchState
  // eslint-disable-next-line max-params
) => {
  if (fetchMoreLocked.current || products.length === 0) {
    return
  }

  const isForward = direction === FETCH_TYPE.NEXT

  fetchMoreLocked.current = true

  setLoading(true)

  return fetchMore({
    variables: {
      from,
      to,
      fuzzy,
      operator,
      searchState,
    },
    updateQuery: (prevResult, { fetchMoreResult }) => {
      setLoading(false)
      fetchMoreLocked.current = false

      if (!products || !fetchMoreResult) {
        updateQueryError.current = true

        return
      }

      // backwards compatibility
      if (prevResult && prevResult.search) {
        return {
          search: {
            ...fetchMoreResult,
            products: isForward
              ? [
                  ...fetchMoreResult.search.products
                ]
              : [
                  ...fetchMoreResult.search.products
                ],
          },
        }
      }

      return {
        ...fetchMoreResult,
        productSearch: {
          ...fetchMoreResult.productSearch,
          products: isForward
            ? [...fetchMoreResult.productSearch.products]
            : [...fetchMoreResult.productSearch.products],
        },
      }
    },
  }).catch((error) => {
    setLoading(false)
    fetchMoreLocked.current = false
    updateQueryError.current = true

    return { error }
  })
}

export const usePageNavigation = (props) => {
  const {
    page,
    maxItemsPerPage,
    fetchMore,
    products,
    queryData: { query, map, orderBy, priceRange },
  } = props;

  const { setQuery, query: runtimeQuery } = useRuntime();
  const { fuzzy, operator, searchState } = useSearchState();
  
  const currentPage = (runtimeQuery.page && Number(runtimeQuery.page)) || page;

  const initialState = {
    page: currentPage,
    nextPage: currentPage + 1,
    previousPage: currentPage - 1,
    from: (currentPage - 1) * maxItemsPerPage,
    to: currentPage * maxItemsPerPage - 1
  }

  const [ pageState, setPageState ] = useState(initialState);
  const [ loading, setLoading ] = useFetchingMore();
  const isFirstRender = useRef(true);
  const fetchMoreLocked = useRef(false); // prevents the user from sending two requests at once
  const updateQueryError = useRef(false); // TODO: refactor this ref

  function resetPageState({ maxItemsPerPage }){
    setPageState({
      page: 1,
      nextPage: 2,
      previousPage: 0,
      from: 0,
      to: maxItemsPerPage - 1,
    })
  }

  function nextPagePageState({ to, from}){
    setPageState((pageState) => ({
      ...pageState,
      page: pageState.nextPage,
      nextPage: pageState.nextPage + 1,
      previousPage: pageState.page,
      from,
      to,
    }));
  }

  function previousPagePageState({ from, to }){
    setPageState((pageState) => ({
      ...pageState,
      page: pageState.previousPage,
      previousPage: pageState.previousPage - 1,
      nextPage: pageState.page,
      from,
      to
    }))
  }

  function goToPageState(state){
    setPageState(state);
  }

  function rollBackPageState(state){
    setPageState(state)
  }

  useEffect(() => {
    if (!isFirstRender.current) {
      resetPageState({
        maxItemsPerPage
      })
    }

    isFirstRender.current = false
  }, [maxItemsPerPage, query, map, orderBy, priceRange]);

  const handleNextPage = async () => {
    const rollbackState = pageState;

    const from = pageState.to + 1;
    const to = from + maxItemsPerPage - 1;

    nextPagePageState({
      to,
      from
    });

    setQuery(
      {
        page: pageState.nextPage
      }, 
      { replace: true}
    );

    const promiseResult = await handleFetchPage(
      from,
      to,
      FETCH_TYPE.NEXT,
      fetchMoreLocked,
      setLoading,
      fetchMore,
      products,
      updateQueryError,
      fuzzy,
      operator,
      sessionStorage.getItem('searchState') ?? searchState
    );

    if (!promiseResult || !updateQueryError.current){
      return;
    }

    rollBackPageState(rollbackState);
    setQuery({ page: pageState.page }, { replace: true })

    updateQueryError.current = false
  }

  const handlePreviousPage = async () => {
    const rollbackState = pageState;

    const to = pageState.from - 1;
    const from = max(0, to - maxItemsPerPage + 1);

    previousPagePageState({
      from,
      to
    });

    setQuery(
      {
        page: pageState.previousPage,
      },
      { replace: true }
    );
    
    const promiseResult = await handleFetchPage(
      from,
      to,
      FETCH_TYPE.PREVIOUS,
      fetchMoreLocked,
      setLoading,
      fetchMore,
      products,
      updateQueryError,
      fuzzy,
      operator,
      sessionStorage.getItem('searchState') ?? searchState
    )

    if (!promiseResult || !updateQueryError.current) {
      return
    }

    // if error, rollback
    rollBackPageState(rollbackState);
    setQuery(
      { page: pageState.page }, 
      { replace: true }
    );

    updateQueryError.current = false
  }

  const handleGoTo = async (page) => {
    const rollbackState = pageState;

    const from = (page - 1) * maxItemsPerPage;
    const to =  page * maxItemsPerPage - 1;
    const nextPage = page + 1;
    const previousPage = page - 1;

    goToPageState({
      page,
      nextPage,
      previousPage,
      from,
      to
    });

    setQuery(
      {
        page: page,
      },
      { replace: true }
    );

    const promiseResult = await handleFetchPage(
      from,
      to,
      FETCH_TYPE.PREVIOUS,
      fetchMoreLocked,
      setLoading,
      fetchMore,
      products,
      updateQueryError,
      fuzzy,
      operator,
      sessionStorage.getItem('searchState') ?? searchState
    );

    if (!promiseResult || !updateQueryError.current) {
      return
    }

    // if error, rollback
    rollBackPageState(rollbackState);
    setQuery(
      { page: pageState.page }, 
      { replace: true }
    );

    updateQueryError.current = false
  }

  return {
    handleFetchPageNext: handleNextPage,
    handleFetchPagePrevious: handlePreviousPage,
    handleGoTo: handleGoTo,
    loading,
    from: pageState.from,
    to: pageState.to,
    nextPage: pageState.nextPage,
    previousPage: pageState.previousPage,
    currentPage: pageState.page
  }
}